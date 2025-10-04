"use client";
import { useEffect, useState } from 'react';

export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<any>(null);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferred(e);
      setSupported(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  return {
    supported,
    prompt: async () => {
      if (!deferred) return false;
      deferred.prompt();
      const choice = await deferred.userChoice;
      setDeferred(null);
      return choice.outcome === 'accepted';
    }
  } as const;
}

export function isIosStandalone() {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = (window.navigator as any).standalone;
  return isIOS && standalone;
}

export function isIosSafari() {
  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isSafari = /safari/.test(ua) && !/crios|fxios|edgios/.test(ua);
  return isIOS && isSafari;
}


