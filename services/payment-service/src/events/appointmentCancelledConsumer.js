import { getChannel, EXCHANGE } from '../config/rabbitmq.js';
import { refundPaymentService } from '../services/paymentService.js';

const QUEUE       = 'payment.appointment.cancelled';
const ROUTING_KEY = 'appointment.cancelled';

export const startAppointmentCancelledConsumer = async () => {
  const channel = getChannel();

  await channel.assertQueue(QUEUE, { durable: true });
  await channel.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY);

  channel.prefetch(1);

  console.log(`[RabbitMQ][appointmentCancelledConsumer] Listening on queue "${QUEUE}" (binding: ${ROUTING_KEY})`);

  channel.consume(QUEUE, async (msg) => {
    if (!msg) return;

    let payload;
    try {
      payload = JSON.parse(msg.content.toString());
    } catch {
      console.error('[RabbitMQ][appointmentCancelledConsumer] Malformed message — discarding');
      channel.nack(msg, false, false);
      return;
    }

    const appointmentId = payload.metadata?.appointmentId;
    if (!appointmentId) {
      console.warn('[RabbitMQ][appointmentCancelledConsumer] Missing appointmentId in metadata — discarding');
      channel.nack(msg, false, false);
      return;
    }

    try {
      await refundPaymentService(appointmentId.toString());
      channel.ack(msg);
      console.log(`[RabbitMQ][appointmentCancelledConsumer] Refund processed for appointment ${appointmentId}`);
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 400) {
        console.warn(`[RabbitMQ][appointmentCancelledConsumer] Refund skipped for ${appointmentId}: ${err.message}`);
        channel.ack(msg);
      } else {
        console.error(`[RabbitMQ][appointmentCancelledConsumer] Unexpected error for ${appointmentId}: ${err.message}`);
        channel.nack(msg, false, true);
      }
    }
  });
};
