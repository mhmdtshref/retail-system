"use client";
import { Workbox } from 'workbox-window';

export function registerServiceWorker() {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  if (process.env.NODE_ENV !== 'production') return;
  const wb = new Workbox('/sw.js');
  wb.addEventListener('activated', () => {
    // SW active
  });
  // Forward availability updates to app to update Dexie
  navigator.serviceWorker.addEventListener('message', async (event) => {
    try {
      const msg = event.data;
      if (msg?.type === 'availability-update' && Array.isArray(msg?.payload?.availability)) {
        const { posDb } = await import('@/lib/db/posDexie');
        const items = msg.payload.availability as Array<{ sku: string; onHand: number; reserved: number; available: number }>;
        await posDb.transaction('rw', posDb.availabilitySnapshot, async () => {
          for (const a of items) {
            await posDb.availabilitySnapshot.put({ ...a, asOf: Date.now() } as any);
          }
        });
      }
    } catch {}
  });
  wb.register();
}

