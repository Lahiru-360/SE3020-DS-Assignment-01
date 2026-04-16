import amqplib from 'amqplib';

// Exchange
export const EXCHANGE = 'hc.platform.events';

let channel = null;

// Reconnect loop
const reconnect = async (onConnected) => {
  let delay = 3000;
  let attempt = 0;
  while (true) {
    attempt++;
    try {
      const connection = await amqplib.connect(process.env.RABBITMQ_URL);
      channel = await connection.createChannel();
      await channel.assertExchange(EXCHANGE, 'topic', { durable: true });

      channel.on('error', (err) =>
        console.error('[RabbitMQ][notification-service] Channel error:', err.message)
      );
      channel.on('close', () => {
        console.warn('[RabbitMQ][notification-service] Channel closed — reconnecting...');
        channel = null;
        reconnect(onConnected);
      });

      connection.on('error', (err) =>
        console.error('[RabbitMQ][notification-service] Connection error:', err.message)
      );
      connection.on('close', () => {
        console.warn('[RabbitMQ][notification-service] Connection lost — reconnecting...');
        channel = null;
        reconnect(onConnected);
      });

      console.log('[RabbitMQ][notification-service] Connected to', process.env.RABBITMQ_URL);
      delay = 3000;
      if (onConnected) await onConnected();
      return;
    } catch (err) {
      console.warn(
        `[RabbitMQ][notification-service] Attempt ${attempt} failed: ${err.message}. Retrying in ${delay / 1000}s...`
      );
      const jitter = Math.random() * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay + jitter));
      delay = Math.min(delay * 2, 30000);
    }
  }
};

export const connectRabbitMQ = (onConnected) => reconnect(onConnected);

export const getChannel = () => channel;
