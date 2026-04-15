import jwt from 'jsonwebtoken';

/**
 * Generates a JaaS (8x8.vc) JWT for a specific user joining a room.
 *
 * Required env vars:
 *   JAAS_APP_ID      — your JaaS App ID (e.g. "vpaas-magic-cookie-abc123")
 *   JAAS_API_KEY_ID  — the key ID shown in the JaaS dashboard
 *   JAAS_PRIVATE_KEY — the full PEM private key (newlines encoded as \n in .env)
 */
export const generateJaasJwt = ({ userId, userEmail, userName, isModerator, roomName }) => {
  const appId      = process.env.JAAS_APP_ID;
  const apiKeyId   = process.env.JAAS_API_KEY_ID;
  const privateKey = process.env.JAAS_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!appId || !apiKeyId || !privateKey) {
    throw new Error('JaaS environment variables (JAAS_APP_ID, JAAS_API_KEY_ID, JAAS_PRIVATE_KEY) are not configured');
  }

  const now = Math.floor(Date.now() / 1000);

  const payload = {
    iss: 'chat',
    aud: 'jitsi',
    iat: now,
    nbf: now - 10,
    exp: now + 60 * 60 * 2, // valid for 2 hours
    sub: appId,
    room: roomName,
    context: {
      user: {
        id: userId,
        name: userName || userEmail,
        email: userEmail,
        moderator: isModerator ? 'true' : 'false',
        avatar: '',
      },
      features: {
        livestreaming: 'false',
        'outbound-call': 'false',
        transcription: 'false',
        recording: 'false',
      },
    },
  };

  return jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    header: { alg: 'RS256', kid: apiKeyId, typ: 'JWT' },
  });
};

/**
 * Builds the full JaaS join URL with embedded JWT for a given user.
 */
export const buildJoinUrl = ({ roomName, userId, userEmail, userName, isModerator }) => {
  const appId = process.env.JAAS_APP_ID;
  const token = generateJaasJwt({ userId, userEmail, userName, isModerator, roomName });
  return `https://8x8.vc/${appId}/${roomName}?jwt=${token}`;
};
