"use client";
import { posDb } from '@/lib/db/posDexie';

export type LayawayCacheRow = { id: string; code?: string; customerName?: string; phone?: string; total: number; paid: number; balance: number; dueAt: string; status: string; bucket?: string | null; updatedAt: number };

export async function upsertLayawayCache(row: LayawayCacheRow) {
  try {
    const table: any = (posDb as any).layawayCache || await ensureStores();
    await table.put(row);
  } catch {}
}

export async function bulkSetLayawayCache(rows: LayawayCacheRow[]) {
  try {
    const table: any = (posDb as any).layawayCache || await ensureStores();
    await table.bulkPut(rows);
  } catch {}
}

export async function getLayawayCache(): Promise<LayawayCacheRow[]> {
  try {
    const table: any = (posDb as any).layawayCache || await ensureStores();
    return await table.toArray();
  } catch { return []; }
}

export async function queueLayawayPayment(input: { layawayId: string; amount: number; method: 'cash'|'card'|'transfer'|'store_credit'; idempotencyKey: string }) {
  await posDb.outbox.add({ id: crypto.randomUUID(), type: 'LAYAWAY_PAYMENT', payload: input, idempotencyKey: input.idempotencyKey, createdAt: Date.now(), retryCount: 0 });
}

export async function queueLayawayRemind(input: { layawayId: string; channels: Array<'email'|'sms'|'webhook'>; idempotencyKey: string }) {
  await posDb.outbox.add({ id: crypto.randomUUID(), type: 'LAYAWAY_REMIND', payload: input, idempotencyKey: input.idempotencyKey, createdAt: Date.now(), retryCount: 0 });
}

async function ensureStores() {
  if (!(posDb as any).layawayCache) {
    const v = (posDb as any).verno || 7;
    const next = v + 1;
    (posDb as any).version(next).stores({ layawayCache: 'id, updatedAt, dueAt, status, bucket', layawayRemindersDrafts: 'localId, layawayId, createdAt' });
    await (posDb as any).open();
  }
  return (posDb as any).layawayCache;
}

