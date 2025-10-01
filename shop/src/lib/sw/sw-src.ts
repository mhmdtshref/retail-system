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

// Runtime: availability (NetworkFirst)
registerRoute(
  ({ url, request }) => request.method === 'GET' && /\/api\/inventory\/availability/.test(url.pathname),
  new NetworkFirst({ cacheName: 'availability-v1' })
);

// Background Sync Queues with NetworkOnly strategy
const salesQueue = new BackgroundSyncPlugin('salesQueue', { maxRetentionTime: 24 * 60 });
const paymentsQueue = new BackgroundSyncPlugin('paymentsQueue', { maxRetentionTime: 24 * 60 });
const layawayQueue = new BackgroundSyncPlugin('layawayQueue', { maxRetentionTime: 24 * 60 });

registerRoute(
  ({ url, request }) => request.method === 'POST' && /\/api\/sales(\/.*)?$/.test(url.pathname),
  new NetworkOnly({ plugins: [salesQueue] }),
  'POST'
);

registerRoute(
  ({ url, request }) => request.method === 'POST' && /\/api\/sales\/.*\/payments/.test(url.pathname),
  new NetworkOnly({ plugins: [paymentsQueue] }),
  'POST'
);

registerRoute(
  ({ url, request }) => request.method === 'POST' && (/\/api\/sales\/.*\/cancel/.test(url.pathname) || /\/api\/sales\/layaway/.test(url.pathname)),
  new NetworkOnly({ plugins: [layawayQueue] }),
  'POST'
);

// Offline fallback: route to /offline for navigations
setCatchHandler(async ({ event }) => {
  if (event.request.destination === 'document') {
    try {
      const resp = await caches.match('/offline.html');
      if (resp) return resp;
    } catch {}
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
    const clientsList = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    for (const c of clientsList) {
      c.postMessage({ type: 'availability-update', payload: data });
    }
  } catch {}
}

self.addEventListener('periodicsync', (event: any) => {
  if (event.tag === 'availability-sync') {
    event.waitUntil(doAvailabilitySync());
  }
});

self.addEventListener('message', (event: any) => {
  if (event?.data === 'availability-sync-now') {
    event.waitUntil(doAvailabilitySync());
  }
});

