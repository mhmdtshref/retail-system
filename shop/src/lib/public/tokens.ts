import { SignJWT, jwtVerify } from 'jose';

const alg = 'HS256';
const defaultTtlSeconds = 60 * 30; // 30 minutes

function getSecret() {
  return new TextEncoder().encode(process.env.TRACK_SECRET || process.env.NEXTAUTH_SECRET || 'dev-track-secret');
}

export async function signTrackToken(payload: { orderId: string; ttlSeconds?: number }) {
  const secret = getSecret();
  const ttl = payload.ttlSeconds ?? defaultTtlSeconds;
  const token = await new SignJWT({ typ: 'track', orderId: payload.orderId })
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime(`${ttl}s`)
    .sign(secret);
  const exp = Math.floor(Date.now() / 1000) + ttl;
  return { token, exp };
}

export async function verifyTrackToken(token: string): Promise<{ orderId: string; exp?: number }> {
  const secret = getSecret();
  const { payload } = await jwtVerify(token, secret, { algorithms: [alg] });
  if (payload.typ !== 'track' || typeof payload.orderId !== 'string') throw new Error('invalid track token');
  return { orderId: payload.orderId as string, exp: typeof payload.exp === 'number' ? payload.exp : undefined };
}

