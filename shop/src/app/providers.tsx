"use client";
import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/sw/register-sw';
import { startOutboxSyncLoop } from '@/lib/pos/sync';
import { registerPeriodicSync, startForegroundAvailabilityTimer, stopForegroundAvailabilityTimer } from '@/lib/pwa/availability-sync';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    registerServiceWorker();
    const stop = startOutboxSyncLoop();
    (async () => {
      const ok = await registerPeriodicSync();
      if (!ok) startForegroundAvailabilityTimer();
    })();
    return () => { if (typeof stop === 'function') stop(); };
  }, []);
  return <>{children}</>;
}

