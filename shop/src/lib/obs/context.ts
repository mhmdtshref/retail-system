import { AsyncLocalStorage } from 'node:async_hooks';
import { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';

export type RequestContext = {
  requestId: string;
  correlationId: string;
  ipHash?: string;
  userAgent?: string;
  user?: { idHash?: string; role?: string };
  method?: string;
  path?: string;
  startedAt?: number;
};

const storage = new AsyncLocalStorage<RequestContext>();

export function withRequestContext<T>(req: NextRequest, run: () => Promise<T>): Promise<T> {
  const rid = req.headers.get('x-request-id') || randomUUID();
  const corr = req.headers.get('x-correlation-id') || rid;
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';
  const ua = req.headers.get('user-agent') || '';
  const ctx: RequestContext = {
    requestId: rid,
    correlationId: corr,
    ipHash: ip ? `h:${Buffer.from(ip).toString('base64').slice(0,16)}` : undefined,
    userAgent: ua,
    method: req.method,
    path: new URL(req.url).pathname,
    startedAt: Date.now(),
  };
  return storage.run(ctx, run);
}

export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

export function getRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}

export function setUserContext(user: { id?: string; role?: string } | null | undefined) {
  const ctx = storage.getStore();
  if (!ctx) return;
  if (user?.id) ctx.user = { ...(ctx.user||{}), idHash: `h:${Buffer.from(user.id).toString('base64').slice(0,16)}`, role: user.role };
  else if (user?.role) ctx.user = { ...(ctx.user||{}), role: user.role };
}
