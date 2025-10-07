import { SignJWT, jwtVerify } from 'jose';

const alg = 'HS256';
const ttlSeconds = 5 * 60; // 5 minutes

export async function issueOverrideToken(payload: { managerUserId: string; reason?: string }) {
  const secret = new TextEncoder().encode(process.env.OVERRIDE_SECRET || process.env.NEXTAUTH_SECRET || 'dev-override-secret');
  const token = await new SignJWT({ sub: payload.managerUserId, typ: 'override', reason: payload.reason || '' })
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(secret);
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  return { token, exp };
}

export async function verifyOverrideToken(token: string) {
  const secret = new TextEncoder().encode(process.env.OVERRIDE_SECRET || process.env.NEXTAUTH_SECRET || 'dev-override-secret');
  const { payload } = await jwtVerify(token, secret, { algorithms: [alg] });
  if (payload.typ !== 'override') throw new Error('invalid override token');
  return payload;
}
