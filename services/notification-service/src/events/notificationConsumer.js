import { getChannel, EXCHANGE } from '../config/rabbitmq.js';
import { processNotificationService } from '../services/notificationService.js';

// Queue config
const QUEUE   = 'notification.appointment.events';
const BINDING = 'appointment.*';

// Notification consumer
export const startNotificationConsumer = async () => {
  const channel = getChannel();

  await channel.assertQueue(QUEUE, { durable: true });

  // Bind the queue to the exchange with the wildcard routing key.
  await channel.bindQueue(QUEUE, EXCHANGE, BINDING);

  channel.prefetch(1);

  console.log(`[RabbitMQ][notificationConsumer] Listening on queue "${QUEUE}" (binding: ${BINDING})`);

  channel.consume(QUEUE, async (msg) => {
    if (!msg) return; // consumer cancelled by broker

    let payload;
    try {
      payload = JSON.parse(msg.content.toString());
    } catch {
      console.error('[RabbitMQ][notificationConsumer] Malformed message — discarding');
      // nack without requeue: a malformed message will never succeed, discard it
      channel.nack(msg, false, false);
      return;
    }

    try {
      await processNotificationService(payload);
      // ack tells RabbitMQ the message was handled successfully and can be removed
      channel.ack(msg);
      console.log(`[RabbitMQ][notificationConsumer] Processed notification: ${payload.type} → ${payload.recipientEmail}`);
    } catch (err) {
      console.error(`[RabbitMQ][notificationConsumer] Failed to process notification: ${err.message}`);
      channel.nack(msg, false, false);
    }
  });
};
