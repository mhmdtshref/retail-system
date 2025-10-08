import crypto from 'crypto';

export function verifyHmacSha256(rawBody: string, secret?: string, provided?: string): boolean {
  if (!secret) return false;
  if (!provided) return false;
  const clean = provided.startsWith('sha256=') ? provided.slice(7) : provided;
  const h = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(clean));
  } catch {
    return false;
  }
}

