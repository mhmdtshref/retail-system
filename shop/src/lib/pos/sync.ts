"use client";
import { posDb, OutboxItem } from '@/lib/db/posDexie';

async function processItem(item: OutboxItem) {
  if (item.type === 'SALE_CREATE') {
    const draft = item.payload as any;
    const res = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': item.idempotencyKey },
      body: JSON.stringify({
        mode: draft.mode || 'cash',
        lines: draft.lines,
        total: draft.totals.grand,
        downPayment: draft.downPayment,
        schedule: draft.schedule,
        expiresAt: draft.expiresAt,
        minDownPercent: draft.minDownPercent,
        discounts: draft.appliedDiscounts,
        couponCode: draft.couponCode
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
    let saleId = p.saleId as string | undefined;
    if (!saleId) {
      const map = await posDb.syncLog.get({ key: `sale:${p.localSaleId}` } as any);
      if (!map) {
        // Wait until sale synced
        return;
      }
      saleId = map.value;
    }
    const res = await fetch(`/api/sales/${saleId}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': item.idempotencyKey },
      body: JSON.stringify({ method: p.method, amount: p.amount, seq: p.seq })
    });
    if (!res.ok) throw new Error('PAYMENT_ADD failed');
    await posDb.outbox.delete(item.id);
    return;
  }
  if (item.type === 'LAYAWAY_CANCEL') {
    const p = item.payload as any;
    const map = p.saleId ? { value: p.saleId } : await posDb.syncLog.get({ key: `sale:${p.localSaleId}` } as any);
    if (!map) return;
    const saleId = map.value;
    const res = await fetch(`/api/sales/${saleId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': item.idempotencyKey },
      body: JSON.stringify({})
    });
    if (!res.ok) throw new Error('RESERVATION_RELEASE failed');
    await posDb.outbox.delete(item.id);
    return;
  }
  if (item.type === 'LAYAWAY_PAYMENT') {
    const p = item.payload as any;
    const res = await fetch(`/api/layaway/${p.layawayId}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': item.idempotencyKey },
      body: JSON.stringify({ amount: p.amount, method: p.method })
    });
    if (!res.ok) throw new Error('LAYAWAY_PAYMENT failed');
    await posDb.outbox.delete(item.id);
    return;
  }
  if (item.type === 'LAYAWAY_REMIND') {
    const p = item.payload as any;
    const res = await fetch(`/api/layaway/${p.layawayId}/remind`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': item.idempotencyKey },
      body: JSON.stringify({ channels: p.channels })
    });
    if (!res.ok) throw new Error('LAYAWAY_REMIND failed');
    await posDb.outbox.delete(item.id);
    return;
  }
  if (item.type === 'NOTIF_SEND') {
    const p = item.payload as any;
    const res = await fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': item.idempotencyKey },
      body: JSON.stringify({ event: p.event, entity: p.entity, customerId: p.customerId, channels: p.channels, data: p.data })
    });
    if (!res.ok) throw new Error('NOTIF_SEND failed');
    await posDb.outbox.delete(item.id);
    return;
  }
  if (item.type === 'COUNT_SESSION_SYNC') {
    const p = item.payload as any;
    const s = p.session;
    const body: any = { name: s.name, scope: s.scope, location: s.location };
    const res = await fetch('/api/inventory/count-sessions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': item.idempotencyKey }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error('COUNT_SESSION_SYNC create failed');
    const created = await res.json();
    const serverId = created.session._id as string;
    // patch items if any counted provided locally
    const itemsPatch = (p.items || []).map((it: any) => ({ sku: it.sku, counted: it.counted, recount: it.recount, note: it.note }));
    if (itemsPatch.length) {
      const res2 = await fetch(`/api/inventory/count-sessions/${serverId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': item.idempotencyKey + ':patch' }, body: JSON.stringify({ items: itemsPatch, status: 'open' }) });
      if (!res2.ok) throw new Error('COUNT_SESSION_SYNC patch failed');
    }
    await posDb.syncLog.put({ key: `count:${s.localId}`, value: serverId, updatedAt: Date.now() });
    await posDb.outbox.delete(item.id);
    return;
  }
  if (item.type === 'COUNT_POST_VARIANCES') {
    const p = item.payload as any;
    const res = await fetch(`/api/inventory/count-sessions/${p.serverId}/post`, { method: 'POST', headers: { 'Idempotency-Key': item.idempotencyKey } });
    if (!res.ok) throw new Error('COUNT_POST_VARIANCES failed');
    await posDb.outbox.delete(item.id);
    return;
  }
  if (item.type === 'RETURN_CREATE') {
    const p = item.payload as any;
    const res = await fetch('/api/returns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': item.idempotencyKey },
      body: JSON.stringify({ saleId: p.saleId, lines: p.lines, refund: p.refund, notes: p.notes })
    });
    if (!res.ok) throw new Error('RETURN_CREATE failed');
    const data = await res.json();
    await posDb.syncLog.put({ key: `return:${p.localId}`, value: data.returnId, updatedAt: Date.now() });
    await posDb.outbox.delete(item.id);
    return;
  }
  if (item.type === 'EXCHANGE_CREATE') {
    const p = item.payload as any;
    const res = await fetch('/api/exchanges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': item.idempotencyKey },
      body: JSON.stringify({ originalSaleId: p.originalSaleId, returnLines: p.returnLines, newLines: p.newLines, settlement: p.settlement, notes: p.notes })
    });
    if (!res.ok) throw new Error('EXCHANGE_CREATE failed');
    const data = await res.json();
    await posDb.syncLog.put({ key: `exchange:${p.localId}`, value: data.exchangeId, updatedAt: Date.now() });
    await posDb.outbox.delete(item.id);
    return;
  }
  if (item.type === 'CUSTOMER_CREATE') {
    const p = item.payload as any;
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': item.idempotencyKey },
      body: JSON.stringify(p)
    });
    if (!res.ok) throw new Error('CUSTOMER_CREATE failed');
    const data = await res.json();
    try {
      const c = data.customer;
      await posDb.recentCustomers.put({ id: c._id, name: c.fullName_ar || c.fullName_en || '', phones: c.phones, stats: c.stats, updatedAt: Date.now() });
    } catch {}
    await posDb.outbox.delete(item.id);
    return;
  }
  if (item.type === 'CUSTOMER_UPDATE') {
    const p = item.payload as any;
    const id = p.id;
    const res = await fetch(`/api/customers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': item.idempotencyKey },
      body: JSON.stringify(p.patch)
    });
    if (!res.ok) throw new Error('CUSTOMER_UPDATE failed');
    const data = await res.json();
    try {
      const c = data.customer;
      await posDb.recentCustomers.put({ id: c._id, name: c.fullName_ar || c.fullName_en || '', phones: c.phones, stats: c.stats, updatedAt: Date.now() });
    } catch {}
    await posDb.outbox.delete(item.id);
    return;
  }
  if (item.type === 'REFUND_CREATE') {
    const p = item.payload as any;
    const res = await fetch('/api/refunds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': item.idempotencyKey },
      body: JSON.stringify(p)
    });
    if (!res.ok) throw new Error('REFUND_CREATE failed');
    const data = await res.json();
    await posDb.syncLog.put({ key: `refund:${p.localId}`, value: data.refundId, updatedAt: Date.now() });
    await posDb.outbox.delete(item.id);
    return;
  }
  if (item.type === 'CREDIT_ISSUE') {
    const p = item.payload as any;
    const res = await fetch('/api/store-credit/issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': item.idempotencyKey },
      body: JSON.stringify(p)
    });
    if (!res.ok) throw new Error('CREDIT_ISSUE failed');
    const data = await res.json();
    await posDb.syncLog.put({ key: `credit:${p.localId}`, value: data.creditId, updatedAt: Date.now() });
    await posDb.outbox.delete(item.id);
    return;
  }
  if (item.type === 'CREDIT_REDEEM') {
    const p = item.payload as any;
    const res = await fetch('/api/store-credit/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': item.idempotencyKey },
      body: JSON.stringify(p)
    });
    if (!res.ok) throw new Error('CREDIT_REDEEM failed');
    await posDb.outbox.delete(item.id);
    return;
  }
  if (item.type === 'COUPON_REDEEM') {
    const p = item.payload as any;
    // Resolve saleId mapping if only localSaleId is present
    let saleId = p.saleId as string | undefined;
    if (!saleId && p.localSaleId) {
      const map = await posDb.syncLog.get({ key: `sale:${p.localSaleId}` } as any);
      if (!map) return; // wait until sale synced
      saleId = map.value;
    }
    const res = await fetch('/api/coupons/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': item.idempotencyKey },
      body: JSON.stringify({ code: p.code, saleId })
    });
    if (!res.ok) throw new Error('COUPON_REDEEM failed');
    await posDb.outbox.delete(item.id);
    return;
  }
  // notifications outbox (separate table)
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
        try { await processItem(item); } catch (e) { await posDb.outbox.update(item.id, { retryCount: (item.retryCount || 0) + 1 }); }
      }
      // process notification outbox
      const notifItems = await posDb.notifOutbox.orderBy('createdAt').toArray();
      for (const n of notifItems) {
        try {
          const res = await fetch('/api/notifications/send', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': n.idempotencyKey }, body: JSON.stringify(n.payload) });
          if (!res.ok) throw new Error('NOTIF_SEND failed');
          await posDb.notifOutbox.delete(n.id);
        } catch (e) {
          await posDb.notifOutbox.update(n.id, { retryCount: (n.retryCount || 0) + 1 });
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

