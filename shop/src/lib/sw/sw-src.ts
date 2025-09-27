import { clientsClaim } from 'workbox-core';
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute, setCatchHandler } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

declare let self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{url: string; revision?: string}>; skipWaiting: () => void };

clientsClaim();
self.skipWaiting();

// Precache app shell and assets injected at build time
precacheAndRoute(self.__WB_MANIFEST || []);

// Runtime: static assets
registerRoute(
  ({ request }) => request.destination === 'style' || request.destination === 'script' || request.destination === 'font',
  new StaleWhileRevalidate({ cacheName: 'static-assets' })
);

// Runtime: products & customers lookup (CacheFirst)
registerRoute(
  ({ url, request }) => request.method === 'GET' && (/\/api\/products/.test(url.pathname) || /\/api\/customers/.test(url.pathname)),
  new CacheFirst({ cacheName: 'lookups', plugins: [] })
);

// Runtime: availability (NetworkFirst)
registerRoute(
  ({ url, request }) => request.method === 'GET' && /\/api\/inventory\/availability/.test(url.pathname),
  new NetworkFirst({ cacheName: 'availability' })
);

// Background Sync Queues
const salesQueue = new BackgroundSyncPlugin('salesQueue', { maxRetentionTime: 24 * 60 });
const paymentsQueue = new BackgroundSyncPlugin('paymentsQueue', { maxRetentionTime: 24 * 60 });

registerRoute(
  ({ url, request }) => request.method === 'POST' && /\/api\/sales/.test(url.pathname),
  new StaleWhileRevalidate({ cacheName: 'post-sales', plugins: [salesQueue] }),
  'POST'
);

registerRoute(
  ({ url, request }) => request.method === 'POST' && /\/api\/payments/.test(url.pathname),
  new StaleWhileRevalidate({ cacheName: 'post-payments', plugins: [paymentsQueue] }),
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

