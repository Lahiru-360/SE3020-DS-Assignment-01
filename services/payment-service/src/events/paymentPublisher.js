import { getChannel, EXCHANGE } from '../config/rabbitmq.js';

const ROUTING_KEYS = {
  payment_succeeded: 'payment.succeeded',
  payment_failed:    'payment.failed',
  payment_refunded:  'payment.refunded',
};

export const publishPaymentEvent = (type, payload) => {
  const routingKey = ROUTING_KEYS[type];
  if (!routingKey) {
    console.warn(`[RabbitMQ][paymentPublisher] Unknown event type: ${type}`);
    return;
  }

  const channel = getChannel();
  if (!channel) {
    console.error(`[RabbitMQ][paymentPublisher] Channel not ready, dropping event: ${routingKey}`);
    return;
  }

  channel.publish(EXCHANGE, routingKey, Buffer.from(JSON.stringify(payload)), {
    persistent: true,
    contentType: 'application/json',
  });

  console.log(`[RabbitMQ][paymentPublisher] Published → ${routingKey}`);
};
