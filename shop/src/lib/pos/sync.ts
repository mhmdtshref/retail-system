"use client";
import { posDb, OutboxItem } from '@/lib/db/posDexie';

async function processItem(item: OutboxItem) {
  if (item.type === 'SALE_CREATE') {
    const draft = item.payload as any;
    const res = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': item.idempotencyKey },
      body: JSON.stringify({
        lines: draft.lines,
        total: draft.totals.grand
      })
    });
    if (!res.ok) throw new Error('SALE_CREATE failed');
    const data = await res.json();
    await posDb.syncLog.put({ key: `sale:${draft.localSaleId}`, value: data.saleId, updatedAt: Date.now() });
    await posDb.outbox.delete(item.id);
    return;
  }
  if (item.type === 'PAYMENT_ADD') {
    const p = item.payload as any;
    const map = await posDb.syncLog.get({ key: `sale:${p.localSaleId}` } as any);
    if (!map) {
      // Wait until sale synced
      return;
    }
    const saleId = map.value;
    const res = await fetch(`/api/sales/${saleId}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': item.idempotencyKey },
      body: JSON.stringify({ method: p.method, amount: p.amount, seq: p.seq })
    });
    if (!res.ok) throw new Error('PAYMENT_ADD failed');
    await posDb.outbox.delete(item.id);
    return;
  }
}

export function startOutboxSyncLoop() {
  let running = false;
  async function tick() {
    if (running) return;
    if (!navigator.onLine) return;
    running = true;
    try {
      const items = await posDb.outbox.orderBy('createdAt').toArray();
      for (const item of items) {
        try {
          await processItem(item);
        } catch (e) {
          await posDb.outbox.update(item.id, { retryCount: (item.retryCount || 0) + 1 });
        }
      }
    } finally {
      running = false;
    }
  }
  tick();
  const id = setInterval(tick, 5000);
  window.addEventListener('online', tick);
  return () => {
    clearInterval(id);
    window.removeEventListener('online', tick);
  };
}

