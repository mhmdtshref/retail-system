"use client";

export async function registerPeriodicSync() {
  if (!('serviceWorker' in navigator)) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    // @ts-ignore
    if ('periodicSync' in reg) {
      // @ts-ignore
      const status = await navigator.permissions.query({ name: 'periodic-background-sync' as any });
      if (status.state === 'granted') {
        // @ts-ignore
        await reg.periodicSync.register('availability-sync', { minInterval: 15 * 60 * 1000 });
        return true;
      }
    }
  } catch {}
  return false;
}

let fallbackTimer: any;
export async function startForegroundAvailabilityTimer() {
  if (fallbackTimer) return;
  fallbackTimer = setInterval(() => {
    if (navigator?.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage('availability-sync-now');
    }
  }, 15 * 60 * 1000);
}

export function stopForegroundAvailabilityTimer() {
  if (fallbackTimer) clearInterval(fallbackTimer);
  fallbackTimer = undefined;
}


