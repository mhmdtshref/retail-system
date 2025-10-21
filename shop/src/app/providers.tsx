"use client";
import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/sw/register-sw';
import { startOutboxSyncLoop } from '@/lib/pos/sync';
import { registerPeriodicSync, startForegroundAvailabilityTimer } from '@/lib/pwa/availability-sync';
import { useInstallPrompt, isIosSafari } from '@/lib/pwa/install';
import { PwaInstallBanner, IosAddToHomeSheet } from './components/PwaInstallBanner';

export function Providers({ children }: { children: React.ReactNode }) {
  const install = useInstallPrompt();
  useEffect(() => {
    registerServiceWorker();
    const stop = startOutboxSyncLoop();
    (async () => {
      const ok = await registerPeriodicSync();
      if (!ok) startForegroundAvailabilityTimer();
    })();
    // Optional: show install banner for Android/Chrome
    if (install.supported) {
      setTimeout(() => {
        // Fire a custom event; UI layer can display a dialog based on this
        window.dispatchEvent(new CustomEvent('pwa:show-install'));
      }, 2000);
    }
    // iOS Safari guide event
    if (isIosSafari()) {
      setTimeout(() => window.dispatchEvent(new CustomEvent('pwa:show-ios-guide')), 2000);
    }
    return () => { if (typeof stop === 'function') stop(); };
  }, [install.supported]);
  return <>
    {children}
    {/* Clerk mounts its own modals; nothing needed here */}
    <PwaInstallBanner />
    <IosAddToHomeSheet />
  </>;
}

