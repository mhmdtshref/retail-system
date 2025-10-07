import type { Action, Role } from './policies';
import { ROLE_PERMS } from './policies';

export type Subject = { type: string; id?: string } | undefined;
export type Context = { storeId?: string } | undefined;

export type SessionUser = { _id?: string; id?: string; role: Role; email?: string; name?: string; status?: 'active'|'disabled' } | null | undefined;

export function can(user: SessionUser, action: Action, _subject?: Subject, _ctx?: Context): boolean {
  if (!user) return false;
  if (user.status === 'disabled') return false;
  const role = user.role as Role;
  const perms = ROLE_PERMS[role];
  if (!perms) return false;
  if (perms.length === 1 && (perms as any)[0] === '*') return true;
  return (perms as Action[]).includes(action);
}

export function minRole(user: SessionUser, min: Role): boolean {
  if (!user) return false;
  const order: Role[] = ['viewer','staff','cashier','manager','owner'];
  return order.indexOf(user.role) >= order.indexOf(min);
}
