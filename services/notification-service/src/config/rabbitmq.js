import amqplib from 'amqplib';

// ─── Exchange shared across all HC Platform services ────────────────────────
export const EXCHANGE = 'hc.platform.events';

let channel = null;

// ─── Connect with startup retry ─────────────────────────────────────────────
export const connectRabbitMQ = async (maxRetries = 10, retryIntervalMs = 3000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const connection = await amqplib.connect(process.env.RABBITMQ_URL);

      channel = await connection.createChannel();

      await channel.assertExchange(EXCHANGE, 'topic', { durable: true });

      connection.on('error', (err) =>
        console.error('[RabbitMQ][notification-service] Connection error:', err.message)
      );
      connection.on('close', () => {
        console.warn('[RabbitMQ][notification-service] Connection closed');
        channel = null;
      });

      console.log('[RabbitMQ][notification-service] Connected to', process.env.RABBITMQ_URL);
      return channel;
    } catch (err) {
      console.warn(
        `[RabbitMQ][notification-service] Attempt ${attempt}/${maxRetries} failed: ${err.message}.` +
          (attempt < maxRetries ? ` Retrying in ${retryIntervalMs / 1000}s...` : ' Giving up.')
      );
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryIntervalMs));
      }
    }
  }
  throw new Error('[RabbitMQ][notification-service] Could not connect after all retries');
};

export const getChannel = () => channel;
