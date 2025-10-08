export async function withRetry<T>(fn: () => Promise<T>, opts?: { retries?: number; baseMs?: number }): Promise<T> {
  const retries = opts?.retries ?? 3;
  const baseMs = opts?.baseMs ?? 300;
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn();
    } catch (e) {
      if (attempt >= retries) throw e;
      const delay = Math.min(5000, baseMs * Math.pow(2, attempt));
      await new Promise((r) => setTimeout(r, delay));
      attempt++;
    }
  }
}

export function hashString(input: string): string {
  if (typeof window === 'undefined') {
    const { createHash } = require('crypto');
    return createHash('sha256').update(input).digest('hex');
  }
  // Fallback simple hash in browser environments if ever used
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return String(h >>> 0);
}
