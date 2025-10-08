"use client";
import { posDb } from '@/lib/db/posDexie';

export async function cacheLayawayRows(rows: Array<{ id: string; customerName?: string; phone?: string; total: number; paid: number; balance: number; dueAt: string; status: string; bucket?: string }>) {
  const now = Date.now();
  const mapped = rows.map((r) => ({ id: r.id, customerName: r.customerName, phone: r.phone, total: r.total, paid: r.paid, balance: r.balance, dueAt: r.dueAt, status: r.status, bucket: r.bucket, updatedAt: now }));
  try { await (posDb as any).layawayCache.bulkPut(mapped); } catch {}
}

export async function getCachedLayawayRows() {
  try { return await (posDb as any).layawayCache.orderBy('updatedAt').reverse().toArray(); } catch { return []; }
}

export async function enqueueLayawayPayment(layawayId: string, amount: number, method: 'cash'|'card'|'transfer'|'store_credit', idempotencyKey: string) {
  const id = cryptoRandom();
  await posDb.outbox.add({ id, type: 'LAYAWAY_PAYMENT', payload: { layawayId, amount, method }, idempotencyKey, createdAt: Date.now(), retryCount: 0 });
}

export async function enqueueLayawayRemind(layawayId: string, channels: Array<'email'|'sms'|'webhook'>, idempotencyKey: string) {
  const id = cryptoRandom();
  await posDb.outbox.add({ id, type: 'LAYAWAY_REMIND', payload: { layawayId, channels }, idempotencyKey, createdAt: Date.now(), retryCount: 0 });
}

function cryptoRandom() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

