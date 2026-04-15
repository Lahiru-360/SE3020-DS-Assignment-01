import amqplib from 'amqplib';

export const EXCHANGE = 'hc.platform.events';

let channel = null;

export const connectRabbitMQ = async (maxRetries = 10, retryIntervalMs = 3000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const connection = await amqplib.connect(process.env.RABBITMQ_URL);

      channel = await connection.createChannel();

      await channel.assertExchange(EXCHANGE, 'topic', { durable: true });

      connection.on('error', (err) =>
        console.error('[RabbitMQ][payment-service] Connection error:', err.message)
      );
      connection.on('close', () => {
        console.warn('[RabbitMQ][payment-service] Connection closed');
        channel = null;
      });

      console.log('[RabbitMQ][payment-service] Connected to', process.env.RABBITMQ_URL);
      return channel;
    } catch (err) {
      console.warn(
        `[RabbitMQ][payment-service] Attempt ${attempt}/${maxRetries} failed: ${err.message}.` +
          (attempt < maxRetries ? ` Retrying in ${retryIntervalMs / 1000}s...` : ' Giving up.')
      );
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryIntervalMs));
      }
    }
  }
  throw new Error('[RabbitMQ][payment-service] Could not connect after all retries');
};

export const getChannel = () => channel;
