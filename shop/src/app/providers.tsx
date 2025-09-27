"use client";
import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/sw/register-sw';
import { startOutboxSyncLoop } from '@/lib/pos/sync';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    registerServiceWorker();
    const stop = startOutboxSyncLoop();
    return () => { if (typeof stop === 'function') stop(); };
  }, []);
  return <>{children}</>;
}

