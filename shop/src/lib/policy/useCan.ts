"use client";
import { useEffect, useState } from 'react';
import type { Action } from './policies';

// Minimal client-side cache of role from a public endpoint or injected global; replaced later by real session
export function useCan(action: Action) {
  const [allowed, setAllowed] = useState<boolean>(false);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/self');
        if (!res.ok) { setAllowed(false); return; }
        const data = await res.json();
        const role = (data && data.user && data.user.role) || 'viewer';
        const perms = await import('./policies');
        if (perms.ROLE_PERMS[role]) {
          const p = (perms.ROLE_PERMS as any)[role];
          setAllowed(Array.isArray(p) && (p[0] === '*' || p.includes(action)));
        } else {
          setAllowed(false);
        }
      } catch { setAllowed(false); }
    })();
  }, [action]);
  return allowed;
}
