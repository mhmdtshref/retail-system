import crypto from 'crypto';

export function maskPII(obj: any): any {
  if (obj == null) return obj;
  if (typeof obj === 'string') return maskString(obj);
  if (Array.isArray(obj)) return obj.map(maskPII);
  if (typeof obj === 'object') {
    const result: any = {};
    for (const [k, v] of Object.entries(obj)) {
      if (/email|phone|token|secret|key|password|pin|card/i.test(k)) {
        result[k] = typeof v === 'string' ? hash(v) : undefined;
      } else {
        result[k] = maskPII(v as any);
      }
    }
    return result;
  }
  return obj;
}

export function hash(input: string): string {
  const h = crypto.createHash('sha256').update(String(input)).digest('hex');
  return `h:${h.slice(0, 16)}`;
}

export function maskString(s: string): string {
  if (s.length <= 4) return '*'.repeat(s.length);
  return `${s.slice(0, 2)}***${s.slice(-2)}`;
}
