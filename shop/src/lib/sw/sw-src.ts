import { clientsClaim, setCacheNameDetails } from 'workbox-core';
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute, setCatchHandler } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst, NetworkOnly } from 'workbox-strategies';
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { ExpirationPlugin } from 'workbox-expiration';

declare let self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{url: string; revision?: string}>; skipWaiting: () => void };

clientsClaim();
self.skipWaiting();

setCacheNameDetails({ prefix: 'retail-pos', suffix: 'v1' });

// Precache app shell and assets injected at build time
precacheAndRoute(self.__WB_MANIFEST || []);

// Navigations: try network, fall back to cache, then offline page
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({ cacheName: 'pages-v1' })
);

// POS bootstrap: cache-first to allow offline reads of initial data
registerRoute(
  ({ url, request }) => request.method === 'GET' && /\/api\/pos\/bootstrap$/.test(url.pathname),
  new StaleWhileRevalidate({ cacheName: 'bootstrap-v1' })
);

// Runtime: static assets
registerRoute(
  ({ request }) => request.destination === 'style' || request.destination === 'script' || request.destination === 'font',
  new StaleWhileRevalidate({ cacheName: 'static-v1' })
);

// Runtime: product images
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images-v1',
    plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 14 })]
  })
);

// Runtime: products & customers lookup (CacheFirst, short maxAge)
registerRoute(
  ({ url, request }) => request.method === 'GET' && (/\/api\/products/.test(url.pathname) || /\/api\/customers/.test(url.pathname)),
  new CacheFirst({
    cacheName: 'lookups-v1',
    plugins: [new ExpirationPlugin({ maxEntries: 500, maxAgeSeconds: 60 * 10 })]
  })
);

// Availability: POST bulk endpoint with IndexedDB fallback when offline
async function readAvailabilityFromIDB(skus: string[]) {
  try {
    const db = await (self as any).indexedDB.open('pos-db-v1');
    const conn: IDBDatabase = await new Promise((resolve, reject) => {
      db.addEventListener('success', () => resolve((db as any).result));
      db.addEventListener('error', () => reject((db as any).error));
    });
    const tx = conn.transaction('availabilitySnapshot', 'readonly');
    const store = tx.objectStore('availabilitySnapshot');
    const out: any[] = [];
    await Promise.all(
      skus.map(
        (sku) =>
          new Promise<void>((resolve) => {
            const req = store.get(sku);
            req.onsuccess = () => {
              const v = req.result;
              if (v) out.push({ sku, onHand: v.onHand, reserved: v.reserved, available: v.available, asOf: v.asOf });
              resolve();
            };
            req.onerror = () => resolve();
          })
      )
    );
    try { conn.close(); } catch {}
    return new Response(JSON.stringify({ availability: out }), { headers: { 'Content-Type': 'application/json' }, status: 200 });
  } catch {
    return new Response(JSON.stringify({ availability: [] }), { headers: { 'Content-Type': 'application/json' }, status: 200 });
  }
}

registerRoute(
  ({ url, request }) => request.method === 'POST' && /\/api\/(pos|inventory)\/availability\/bulk/.test(url.pathname),
  async ({ request }) => {
    const clone = request.clone();
    try {
      // Try network first
      return await fetch(request);
    } catch {
      // On failure/offline, synthesize from IDB snapshot
      let skus: string[] = [];
      try {
        const body = await clone.json();
        skus = Array.isArray(body?.skus) ? body.skus : [];
      } catch {}
      return readAvailabilityFromIDB(skus);
    }
  },
  'POST'
);

// Background Sync Queues with NetworkOnly strategy
function withExponentialBackoff() {
  return async ({ queue }: any) => {
    let attempt = 0;
    // Replay until empty, backing off between failures
    while (true) {
      try {
        await queue.replayRequests();
        break;
      } catch (err) {
        attempt += 1;
        const delay = Math.min(30000, 1000 * Math.pow(2, attempt));
        await new Promise((r) => setTimeout(r, delay));
        // loop continues
      }
    }
  };
}

const salesQueue = new BackgroundSyncPlugin('salesQueue', { maxRetentionTime: 24 * 60, onSync: withExponentialBackoff() });
const paymentsQueue = new BackgroundSyncPlugin('paymentsQueue', { maxRetentionTime: 24 * 60, onSync: withExponentialBackoff() });
const layawayQueue = new BackgroundSyncPlugin('layawayQueue', { maxRetentionTime: 24 * 60, onSync: withExponentialBackoff() });

// Order matters: payments, layaway/cancel/partial, then generic sales
registerRoute(
  ({ url, request }) => request.method === 'POST' && /\/api\/sales\/.*\/payments/.test(url.pathname),
  new NetworkOnly({ plugins: [paymentsQueue] }),
  'POST'
);

registerRoute(
  ({ url, request }) => request.method === 'POST' && (/\/api\/sales\/.*\/(cancel|partial)/.test(url.pathname) || /\/api\/sales\/layaway/.test(url.pathname)),
  new NetworkOnly({ plugins: [layawayQueue] }),
  'POST'
);

registerRoute(
  ({ url, request }) => request.method === 'POST' && /\/api\/sales(\/.*)?$/.test(url.pathname),
  new NetworkOnly({ plugins: [salesQueue] }),
  'POST'
);

// Offline fallback: documents -> cached offline page or Next route
setCatchHandler(async ({ event }) => {
  if (event.request.destination === 'document') {
    const cached = await caches.match('/offline.html');
    if (cached) return cached;
    return Response.redirect('/offline');
  }
  return Response.error();
});

// Periodic Sync handler and message-triggered sync
async function doAvailabilitySync() {
  try {
    const bootstrap = await fetch('/api/pos/bootstrap').then((r) => r.json()).catch(() => null);
    const topSkus: string[] = bootstrap?.topSkus || [];
    if (!topSkus.length) return;
    const res = await fetch('/api/pos/availability/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ skus: topSkus }) });
    if (!res.ok) return;
    const data = await res.json();
    const clientsList = await (self as any).clients.matchAll({ includeUncontrolled: true, type: 'window' });
    for (const c of clientsList) {
      c.postMessage({ type: 'availability-update', payload: data });
    }
  } catch {}
}

(self as any).addEventListener('periodicsync', (event: any) => {
  if (event.tag === 'availability-sync') {
    event.waitUntil(doAvailabilitySync());
  }
});

(self as any).addEventListener('message', (event: any) => {
  if (event?.data === 'availability-sync-now') {
    event.waitUntil(doAvailabilitySync());
  }
});

