import { getChannel, EXCHANGE } from '../config/rabbitmq.js';

// ─── Routing key map ─────────────────────────────────────────────────────────
// Maps the notification `type` string used throughout the codebase to a
// dot-separated RabbitMQ routing key under the "appointment.*" pattern.
// The notification-service consumer binds its queue with "appointment.*",
// so every key here will be delivered to it automatically.
const ROUTING_KEYS = {
  appointment_booked:    'appointment.booked',
  appointment_confirmed: 'appointment.confirmed',
  appointment_completed: 'appointment.completed',
  appointment_cancelled: 'appointment.cancelled',
};

// ─── Publish an appointment event ───────────────────────────────────────────
// `type`    — one of the keys in ROUTING_KEYS above
// `payload` — the fully-formed notification payload (already enriched with
//             recipient details and metadata by the caller)
//
// channel.publish() is synchronous and non-blocking. It writes the message
// to the TCP send buffer and returns immediately — no awaiting needed.
// persistent: true ensures the message survives a RabbitMQ broker restart.
export const publishAppointmentEvent = (type, payload) => {
  const routingKey = ROUTING_KEYS[type];
  if (!routingKey) {
    console.warn(`[RabbitMQ][appointmentPublisher] Unknown event type: ${type}`);
    return;
  }

  const channel = getChannel();
  if (!channel) {
    // RabbitMQ is temporarily disconnected. Log and move on — the HTTP
    // response has already been sent, so we must not throw here.
    console.error(`[RabbitMQ][appointmentPublisher] Channel not ready, dropping event: ${routingKey}`);
    return;
  }

  channel.publish(EXCHANGE, routingKey, Buffer.from(JSON.stringify(payload)), {
    persistent: true,   // survives broker restarts
    contentType: 'application/json',
  });

  console.log(`[RabbitMQ][appointmentPublisher] Published → ${routingKey}`);
};
