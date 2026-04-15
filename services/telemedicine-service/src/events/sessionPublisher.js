import { getChannel, EXCHANGE } from '../config/rabbitmq.js';

// ─── Routing key ─────────────────────────────────────────────────────────────
// The appointment-service consumer binds its queue to this exact key.
const ROUTING_KEY = 'telemedicine.session.ended';

// ─── Publish a session.ended event ──────────────────────────────────────────
// Called by endSessionService() after the telemedicine session is marked ENDED.
// The appointment-service consumes this event and marks the appointment as
// "completed" — decoupling telemedicine from the appointment HTTP API.
//
// Payload: { appointmentId }
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
