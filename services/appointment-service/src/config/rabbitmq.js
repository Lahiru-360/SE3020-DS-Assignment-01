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
        console.error('[RabbitMQ][appointment-service] Channel error:', err.message)
      );
      channel.on('close', () => {
        console.warn('[RabbitMQ][appointment-service] Channel closed — reconnecting...');
        channel = null;
        reconnect(onConnected);
      });

      connection.on('error', (err) =>
        console.error('[RabbitMQ][appointment-service] Connection error:', err.message)
      );
      connection.on('close', () => {
        console.warn('[RabbitMQ][appointment-service] Connection lost — reconnecting...');
        channel = null;
        reconnect(onConnected);
      });

      console.log('[RabbitMQ][appointment-service] Connected to', process.env.RABBITMQ_URL);
      delay = 3000; // reset backoff on success
      if (onConnected) await onConnected();
      return;
    } catch (err) {
      console.warn(
        `[RabbitMQ][appointment-service] Attempt ${attempt} failed: ${err.message}. Retrying in ${delay / 1000}s...`
      );
      const jitter = Math.random() * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay + jitter));
      delay = Math.min(delay * 2, 30000); // exponential backoff with jitter, cap at 30s
    }
  }
};

export const connectRabbitMQ = (onConnected) => reconnect(onConnected);

// Returns active channel
export const getChannel = () => channel;
