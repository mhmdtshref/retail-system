"use client";
import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/sw/register-sw';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    registerServiceWorker();
  }, []);
  return <>{children}</>;
}

