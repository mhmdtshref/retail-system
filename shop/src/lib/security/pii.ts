// Cross-runtime hashing without Node's crypto. This is not
// cryptographically secure; it is used only for PII redaction IDs.
function hash64Hex(input: string): string {
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = (h1 ^ (h1 >>> 16)) >>> 0;
  h2 = (h2 ^ (h2 >>> 16)) >>> 0;
  const p1 = ('00000000' + h1.toString(16)).slice(-8);
  const p2 = ('00000000' + h2.toString(16)).slice(-8);
  return p1 + p2; // 16 hex chars
}

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
  const h = hash64Hex(String(input));
  return `h:${h.slice(0, 16)}`;
}

export function maskString(s: string): string {
  if (s.length <= 4) return '*'.repeat(s.length);
  return `${s.slice(0, 2)}***${s.slice(-2)}`;
}
