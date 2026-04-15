import twilio from 'twilio';

// Twilio REST client — configured from environment variables.
// TWILIO_ACCOUNT_SID   : AC… identifier from the Twilio Console
// TWILIO_AUTH_TOKEN    : Auth Token from the Twilio Console
// TWILIO_MESSAGING_SID : MG… Messaging Service SID (handles sender selection)
//
// If credentials are absent or invalid the client will be null and SMS will be
// skipped gracefully — the service can still boot and send emails normally.

let twilioClient = null;

const sid = process.env.TWILIO_ACCOUNT_SID;
const token = process.env.TWILIO_AUTH_TOKEN;

if (!sid || !token) {
  console.warn('[Twilio] Credentials not set — SMS channel disabled.');
} else if (!sid.startsWith('AC')) {
  console.error(
    `[Twilio] TWILIO_ACCOUNT_SID must start with "AC" (got "${sid.substring(0, 4)}…"). ` +
    'SMS channel disabled. Get your Account SID from https://console.twilio.com'
  );
} else {
  try {
    twilioClient = twilio(sid, token);
    console.log('[Twilio] Client initialised successfully.');
  } catch (err) {
    console.error('[Twilio] Failed to initialise client — SMS channel disabled.', err.message);
  }
}

export { twilioClient };
