import crypto from 'crypto';

export function stableStringify(obj: any): string {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map((v) => stableStringify(v)).join(',') + ']';
  const keys = Object.keys(obj).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}';
}

export function sha256Hex(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function computeParamsHash(obj: any): string {
  return sha256Hex(stableStringify(obj));
}

export function deterministicBatchId(prefix: string, hash: string): string {
  const slug = hash.slice(0, 10).toUpperCase();
  return `${prefix}-${slug}`;
}

