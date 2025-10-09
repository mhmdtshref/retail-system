import { NextRequest } from 'next/server';
import { AuditLog } from '@/lib/models/AuditLog';
import { maskPII } from './pii';

export type AuditAction =
  | 'auth.login' | 'auth.logout' | 'auth.failed'
  | 'user.create' | 'user.role_change'
  | 'settings.update' | 'secrets.rotate'
  | 'order.create' | 'order.update' | 'order.void'
  | 'payment.capture' | 'refund.create'
  | 'inventory.adjust' | 'transfer.dispatch' | 'transfer.receive'
  | 'export.run' | 'restore.run'
  | 'notification.send' | 'webhook.received' | 'webhook.rejected';

export type AuditStatus = 'success'|'denied'|'failed';

export async function writeAudit(opts: {
  action: AuditAction;
  status?: AuditStatus;
  actor?: { id?: string; role?: string };
  entity?: { type: string; id?: string; code?: string };
  req?: NextRequest;
  requestId?: string;
  correlationId?: string;
  beforeHash?: string;
  afterHash?: string;
  meta?: Record<string, string|number|boolean>;
}) {
  try {
    const ip = opts.req?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined;
    const ua = opts.req?.headers.get('user-agent') || undefined;
    await AuditLog.create({
      action: opts.action,
      status: opts.status || 'success',
      actor: opts.actor,
      entity: opts.entity,
      ip, ua,
      requestId: opts.requestId,
      correlationId: opts.correlationId,
      beforeHash: opts.beforeHash,
      afterHash: opts.afterHash,
      meta: maskPII(opts.meta || {}),
      createdAt: new Date(),
    } as any);
  } catch {}
}

export function withAudit<TArgs extends any[], TResult>(
  action: AuditAction,
  handler: (...args: TArgs) => Promise<TResult>,
  getContext?: (args: TArgs, result?: TResult, error?: unknown) => {
    status?: AuditStatus;
    actor?: { id?: string; role?: string };
    entity?: { type: string; id?: string; code?: string };
    req?: NextRequest;
    requestId?: string;
    correlationId?: string;
    beforeHash?: string;
    afterHash?: string;
    meta?: Record<string, string|number|boolean>;
  }
) {
  return async (...args: TArgs): Promise<TResult> => {
    try {
      const res = await handler(...args);
      const ctx = getContext?.(args, res);
      await writeAudit({ action, status: 'success', ...(ctx || {}) });
      return res;
    } catch (err) {
      const ctx = getContext?.(args, undefined, err);
      await writeAudit({ action, status: 'failed', ...(ctx || {}) });
      throw err;
    }
  };
}
