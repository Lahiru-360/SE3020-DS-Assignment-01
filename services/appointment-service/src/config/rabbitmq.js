import amqplib from 'amqplib';

// ─── Exchange shared across all HC Platform services ────────────────────────
// Type: topic  →  routing keys like "appointment.booked", "telemedicine.session.ended"
// Durable: true  →  survives RabbitMQ restarts
export const EXCHANGE = 'hc.platform.events';

let channel = null;

// ─── Connect with startup retry ─────────────────────────────────────────────
// RabbitMQ container may start after this service in Docker Compose.
// Retries up to `maxRetries` times before giving up.
export const connectRabbitMQ = async (maxRetries = 10, retryIntervalMs = 3000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const connection = await amqplib.connect(process.env.RABBITMQ_URL);

      channel = await connection.createChannel();

      // Declare the exchange. assertExchange is idempotent — safe to call on every startup.
      await channel.assertExchange(EXCHANGE, 'topic', { durable: true });

      // Log but don't crash on unexpected disconnects; let the service degrade gracefully.
      connection.on('error', (err) =>
        console.error('[RabbitMQ][appointment-service] Connection error:', err.message)
      );
      connection.on('close', () => {
        console.warn('[RabbitMQ][appointment-service] Connection closed');
        channel = null;
      });

      console.log('[RabbitMQ][appointment-service] Connected to', process.env.RABBITMQ_URL);
      return channel;
    } catch (err) {
      console.warn(
        `[RabbitMQ][appointment-service] Attempt ${attempt}/${maxRetries} failed: ${err.message}.` +
          (attempt < maxRetries ? ` Retrying in ${retryIntervalMs / 1000}s...` : ' Giving up.')
      );
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryIntervalMs));
      }
    }
  }
  throw new Error('[RabbitMQ][appointment-service] Could not connect after all retries');
};

// ─── Returns the active channel, or null if not yet connected ───────────────
export const getChannel = () => channel;
