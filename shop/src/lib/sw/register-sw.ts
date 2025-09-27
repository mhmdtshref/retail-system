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
  wb.register();
}

