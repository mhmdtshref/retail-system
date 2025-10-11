import { maskPII as deepMaskPII, hash as hashValue } from '@/lib/security/pii';

export type MaskOptions = {
  redactKeys?: RegExp; // override/additional keys to redact
};

const DEFAULT_REDACT = /email|phone|token|secret|key|password|pin|card|authorization|auth|session/i;

export function maskPII<T = any>(input: T, opts?: MaskOptions): T {
  try {
    if (input == null) return input;
    const re = opts?.redactKeys ? combineRegex(DEFAULT_REDACT, opts.redactKeys) : DEFAULT_REDACT;
    return deepMaskCustom(input as any, re) as unknown as T;
  } catch {
    return input;
  }
}

export function hash(input: string | undefined | null): string | undefined {
  if (!input) return undefined;
  return hashValue(String(input));
}

function combineRegex(a: RegExp, b: RegExp): RegExp {
  const source = `(?:${a.source})|(?:${b.source})`;
  return new RegExp(source, a.flags.includes('i') || b.flags.includes('i') ? 'i' : undefined);
}

function deepMaskCustom(obj: any, redact: RegExp): any {
  if (obj == null) return obj;
  if (typeof obj === 'string') return obj.length <= 4 ? '*'.repeat(obj.length) : `${obj.slice(0, 2)}***${obj.slice(-2)}`;
  if (Array.isArray(obj)) return obj.map((v) => deepMaskCustom(v, redact));
  if (typeof obj === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(obj)) {
      if (redact.test(k)) {
        out[k] = typeof v === 'string' ? hashValue(v) : undefined;
      } else {
        out[k] = deepMaskCustom(v, redact);
      }
    }
    return out;
  }
  return obj;
}
