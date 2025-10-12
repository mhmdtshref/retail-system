import { IdempotencyRecord } from '@/lib/models/IdempotencyRecord';
import { stableHash } from '@/lib/utils/hash';

export async function mirrorIdempotencyRecord(input: { key: string; route: string; method: 'POST'|'PATCH'|'PUT'|'DELETE'; request: any; response?: any; entity?: { type?: string; id?: string; code?: string }; ttlSec?: number }) {
  const requestHash = stableHash(input.request);
  const responseHash = input.response ? stableHash(input.response) : undefined;
  const doc = { _id: input.key, route: input.route, method: input.method, requestHash, responseHash, entity: input.entity, createdAt: new Date(), expiresAt: input.ttlSec ? new Date(Date.now() + input.ttlSec * 1000) : undefined, hits: 1, payloadPreview: input.request && typeof input.request === 'object' ? { ...input.request, secret: undefined, token: undefined } : undefined } as any;
  try {
    await IdempotencyRecord.updateOne({ _id: input.key }, { $setOnInsert: doc, $inc: { hits: 1 } }, { upsert: true });
  } catch {}
}
