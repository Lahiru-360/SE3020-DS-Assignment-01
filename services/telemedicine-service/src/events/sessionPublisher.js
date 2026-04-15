import { getChannel, EXCHANGE } from '../config/rabbitmq.js';

const ROUTING_KEY = 'telemedicine.session.ended';

export const publishSessionEnded = (appointmentId) => {
  const channel = getChannel();
  if (!channel) {
    console.error(`[RabbitMQ][sessionPublisher] Channel not ready, dropping session.ended for ${appointmentId}`);
    return;
  }

  channel.publish(
    EXCHANGE,
    ROUTING_KEY,
    Buffer.from(JSON.stringify({ appointmentId })),
    { persistent: true, contentType: 'application/json' }
  );

  console.log(`[RabbitMQ][sessionPublisher] Published → ${ROUTING_KEY} (appointmentId: ${appointmentId})`);
};
