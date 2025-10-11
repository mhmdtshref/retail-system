"use client";
import { posDb } from '@/lib/db/posDexie';
import { getCachedUser } from '@/lib/offline/userRoleCache';

const MAX_QUEUE = 500;

export async function logClientEvent(level: 'info'|'warn'|'error', event: string, ctx?: { route?: string; method?: string; status?: number }) {
  try {
    const user = getCachedUser();
    const item = { level, event, ctx: { ...(ctx||{}), user: user ? { idHash: `h:${btoa(user.id).slice(0,16)}`, role: user.role } : undefined }, ts: Date.now() };
    await posDb.notifOutbox.add({ id: crypto.randomUUID(), type: 'NOTIF_SEND', payload: { event: 'OBS_LOG', entity: { type: 'client', id: item.ts.toString() }, customerId: 'system', data: item }, idempotencyKey: `obs:${item.ts}`, createdAt: Date.now(), retryCount: 0 } as any);
    const count = await posDb.notifOutbox.count();
    if (count > MAX_QUEUE) {
      const toDrop = count - MAX_QUEUE;
      const old = await posDb.notifOutbox.orderBy('createdAt').limit(toDrop).toArray();
      for (const o of old) await posDb.notifOutbox.delete(o.id);
    }
    // Try immediate send when online
    if (navigator.onLine) {
      try {
        await fetch('/api/obs/log', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `obs:${item.ts}` }, body: JSON.stringify(item) });
      } catch {}
    }
  } catch {}
}
