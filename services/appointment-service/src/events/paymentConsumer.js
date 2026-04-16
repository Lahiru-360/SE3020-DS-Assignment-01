import { getChannel, EXCHANGE } from '../config/rabbitmq.js';
import {
  updatePaymentStatusService,
  updateAppointmentStatusService,
  deleteAppointmentInternalService,
  getAppointmentByIdService,
} from '../services/appointmentService.js';

const QUEUE       = 'appointment.payment.events';
const BINDING_KEY = 'payment.*';

export const startPaymentConsumer = async () => {
  const channel = getChannel();

  await channel.assertQueue(QUEUE, { durable: true });
  await channel.bindQueue(QUEUE, EXCHANGE, BINDING_KEY);

  channel.prefetch(1);

  console.log(`[RabbitMQ][paymentConsumer] Listening on queue "${QUEUE}" (binding: ${BINDING_KEY})`);

  channel.consume(QUEUE, async (msg) => {
    if (!msg) return;

    let payload;
    try {
      payload = JSON.parse(msg.content.toString());
    } catch {
      console.error('[RabbitMQ][paymentConsumer] Malformed message — discarding');
      channel.nack(msg, false, false);
      return;
    }

    const routingKey    = msg.fields.routingKey;
    const { appointmentId } = payload;

    if (!appointmentId) {
      console.warn('[RabbitMQ][paymentConsumer] Missing appointmentId — discarding');
      channel.nack(msg, false, false);
      return;
    }

    try {
      if (routingKey === 'payment.succeeded') {
        await updatePaymentStatusService(appointmentId, { paymentStatus: 'paid' });
        const appt = await getAppointmentByIdService(appointmentId);
        if (appt && appt.status === 'pending') {
          await updateAppointmentStatusService(appointmentId, appt.doctorId, 'confirmed');
        } else if (appt) {
          console.warn(`[RabbitMQ][paymentConsumer] Appointment ${appointmentId} already in status "${appt.status}" — skipping confirm`);
        }
        console.log(`[RabbitMQ][paymentConsumer] Appointment ${appointmentId} confirmed (payment succeeded)`);

      } else if (routingKey === 'payment.failed') {
        try {
          await deleteAppointmentInternalService(appointmentId);
        } catch (err) {
          if (err.statusCode === 404) {
            console.warn(`[RabbitMQ][paymentConsumer] Appointment ${appointmentId} already deleted — ACK`);
          } else {
            throw err;
          }
        }
        console.log(`[RabbitMQ][paymentConsumer] Appointment ${appointmentId} deleted (payment failed)`);

      } else if (routingKey === 'payment.refunded') {
        const appt = await getAppointmentByIdService(appointmentId);
        if (appt) {
          await updatePaymentStatusService(appointmentId, { paymentStatus: 'refunded' });
          if (!['cancelled', 'completed'].includes(appt.status)) {
            await updateAppointmentStatusService(appointmentId, appt.doctorId, 'cancelled');
          }
        } else {
          console.warn(`[RabbitMQ][paymentConsumer] Appointment ${appointmentId} not found for refund update (already deleted)`);
        }
        console.log(`[RabbitMQ][paymentConsumer] Appointment ${appointmentId} payment refunded`);

      } else {
        console.warn(`[RabbitMQ][paymentConsumer] Unknown routing key: ${routingKey} — discarding`);
      }

      channel.ack(msg);
    } catch (err) {
      console.error(`[RabbitMQ][paymentConsumer] Failed to process ${routingKey} for ${appointmentId}: ${err.message}`);
      channel.nack(msg, false, true);
    }
  });
};
