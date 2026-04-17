import { getChannel, EXCHANGE } from '../config/rabbitmq.js';
import { updateAppointmentById } from '../repositories/appointmentRepository.js';

// Queue config
const QUEUE       = 'appointment.session.events';
const ROUTING_KEY = 'telemedicine.session.ended';

// Session-ended consumer
export const startSessionConsumer = async () => {
  const channel = getChannel();

  await channel.assertQueue(QUEUE, { durable: true });
  await channel.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY);

  channel.prefetch(1);

  console.log(`[RabbitMQ][sessionConsumer] Listening on queue "${QUEUE}" (binding: ${ROUTING_KEY})`);

  channel.consume(QUEUE, async (msg) => {
    if (!msg) return;

    let payload;
    try {
      payload = JSON.parse(msg.content.toString());
    } catch {
      console.error('[RabbitMQ][sessionConsumer] Malformed message — discarding');
      channel.nack(msg, false, false);
      return;
    }

    const { appointmentId } = payload;

    try {
      await updateAppointmentById(appointmentId, { status: 'completed' });
      channel.ack(msg);
      console.log(`[RabbitMQ][sessionConsumer] Appointment ${appointmentId} marked as completed`);
    } catch (err) {
      console.error(`[RabbitMQ][sessionConsumer] Failed to complete appointment ${appointmentId}: ${err.message}`);
      channel.nack(msg, false, false);
    }
  });
};
