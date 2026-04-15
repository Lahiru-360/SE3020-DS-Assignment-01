import { getChannel, EXCHANGE } from '../config/rabbitmq.js';
import { processNotificationService } from '../services/notificationService.js';

// ─── Queue configuration ─────────────────────────────────────────────────────
const QUEUE   = 'notification.appointment.events';

// "appointment.*" catches every routing key published by appointment-service:
//   appointment.booked | appointment.confirmed | appointment.completed | appointment.cancelled
const BINDING = 'appointment.*';

// ─── Start the notification consumer ────────────────────────────────────────
// Called once at service startup (after connectRabbitMQ resolves).
// Each message is a fully-enriched notification payload — the same shape
// that the old HTTP POST /api/notifications/send endpoint accepted.
// processNotificationService() does the actual email + SMS work.
export const startNotificationConsumer = async () => {
  const channel = getChannel();

  // Declare a durable queue — messages persist if RabbitMQ restarts while
  // the consumer is down, so no notifications are lost.
  await channel.assertQueue(QUEUE, { durable: true });

  // Bind the queue to the exchange with the wildcard routing key.
  await channel.bindQueue(QUEUE, EXCHANGE, BINDING);

  // Process one message at a time per consumer instance.
  // Prevents a slow email/SMS call from causing message pile-ups.
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
      // nack without requeue — avoids infinite retry loops for transient errors.
      // In production, wire a dead-letter exchange here instead.
      channel.nack(msg, false, false);
    }
  });
};
