"use client";
import { posDb } from '@/lib/db/posDexie';

export async function upsertLocalCountSession(input: { localId?: string; name: string; scope: any; location?: string }) {
  const localId = input.localId || crypto.randomUUID();
  await posDb.countSessions.put({ localId, name: input.name, scope: input.scope, location: input.location, status: 'open', createdAt: Date.now() });
  return localId;
}

export async function addLocalCountItem(localSessionId: string, item: { sku: string; onHandAtStart: number; counted?: number; variance?: number; recount?: boolean; note?: string }) {
  const variance = (item.counted ?? 0) - (item.onHandAtStart || 0);
  await posDb.countItems.add({ localSessionId, ...item, variance });
}

export async function queueSyncCountSession(localSessionId: string, idempotencyKey: string) {
  const session = await posDb.countSessions.get({ localId: localSessionId } as any);
  const items = await posDb.countItems.where('localSessionId').equals(localSessionId).toArray();
  await posDb.outbox.add({ id: crypto.randomUUID(), type: 'COUNT_SESSION_SYNC', payload: { session, items }, idempotencyKey, createdAt: Date.now(), retryCount: 0 });
}

export async function queuePostVariances(serverId: string, idempotencyKey: string) {
  await posDb.outbox.add({ id: crypto.randomUUID(), type: 'COUNT_POST_VARIANCES', payload: { serverId }, idempotencyKey, createdAt: Date.now(), retryCount: 0 });
}


