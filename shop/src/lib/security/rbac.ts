import type { SessionUser } from '@/lib/policy/guard';
import { minRole } from '@/lib/policy/guard';

export function isManagerOrOwner(user: SessionUser): boolean {
  return !!user && minRole(user, 'manager');
}

export function assertManagerOrOwner(user: SessionUser) {
  if (!isManagerOrOwner(user)) {
    const err: any = new Error('Forbidden: requires manager or owner');
    err.status = 403;
    throw err;
  }
}
