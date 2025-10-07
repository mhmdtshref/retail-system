"use client";
import { useEffect, useState } from 'react';
import { ROLE_PERMS, type Role, type Action } from './policies';

// Minimal client-side cache of role from a public endpoint or injected global; replaced later by real session
export function useCan(action: Action) {
  const [allowed, setAllowed] = useState<boolean>(false);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/self');
        if (!res.ok) { setAllowed(false); return; }
        const data = await res.json();
        const roleStr: string = (data && data.user && data.user.role) || 'viewer';
        const validRoles = ['owner','manager','cashier','staff','viewer'] as const;
        const rr: Role = (validRoles as readonly string[]).includes(roleStr) ? (roleStr as Role) : 'viewer';
        const p = ROLE_PERMS[rr];
        setAllowed(Array.isArray(p) && ((p as any)[0] === '*' || (p as Action[]).includes(action)));
      } catch { setAllowed(false); }
    })();
  }, [action]);
  return allowed;
}
