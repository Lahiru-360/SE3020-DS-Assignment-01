import twilio from 'twilio';

// Twilio REST client — configured from environment variables.
// TWILIO_ACCOUNT_SID   : AC… identifier from the Twilio Console
// TWILIO_AUTH_TOKEN    : Auth Token from the Twilio Console
// TWILIO_MESSAGING_SID : MG… Messaging Service SID (handles sender selection)
//
// If credentials are absent the client will be null and SMS will be skipped
// gracefully — the service can still boot and send emails normally.

let twilioClient = null;

if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN,
  );
} else {
  console.warn('[Twilio] Credentials not set — SMS channel disabled.');
}

export { twilioClient };
