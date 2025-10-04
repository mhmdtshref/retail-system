"use client";

export async function registerPeriodicSync() {
  if (!('serviceWorker' in navigator)) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    if ('periodicSync' in (reg as any)) {
      const status: any = await (navigator as any).permissions?.query({ name: 'periodic-background-sync' as any });
      if (status.state === 'granted') {
        await (reg as any).periodicSync.register('availability-sync', { minInterval: 15 * 60 * 1000 });
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


