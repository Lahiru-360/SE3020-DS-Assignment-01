import { getChannel, EXCHANGE } from '../config/rabbitmq.js';

// Routing keys
const ROUTING_KEYS = {
  appointment_booked:    'appointment.booked',
  appointment_confirmed: 'appointment.confirmed',
  appointment_completed: 'appointment.completed',
  appointment_cancelled: 'appointment.cancelled',
};

// Publish appointment event
export const publishAppointmentEvent = (type, payload) => {
  const routingKey = ROUTING_KEYS[type];
  if (!routingKey) {
    console.warn(`[RabbitMQ][appointmentPublisher] Unknown event type: ${type}`);
    return;
  }

  const channel = getChannel();
  if (!channel) {
    // Channel not ready — drop event, response already sent
    console.error(`[RabbitMQ][appointmentPublisher] Channel not ready, dropping event: ${routingKey}`);
    return;
  }

  channel.publish(EXCHANGE, routingKey, Buffer.from(JSON.stringify(payload)), {
    persistent: true,   // survives broker restarts
    contentType: 'application/json',
  });

  console.log(`[RabbitMQ][appointmentPublisher] Published → ${routingKey}`);
};
