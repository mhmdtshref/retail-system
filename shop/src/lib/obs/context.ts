import 'server-only';
import { AsyncLocalStorage } from 'node:async_hooks';
import { NextRequest } from 'next/server';

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

// Expose a safe getter on the server runtime so other isomorphic modules
// (e.g., client-safe loggers) can read the current context without
// importing this server-only module in client bundles.
declare global { // eslint-disable-line no-redeclare
  // Using any to avoid leaking types across runtimes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var __getRequestContext: (() => RequestContext | undefined) | undefined;
}
if (typeof globalThis !== 'undefined') {
  // Assign a function that reads from AsyncLocalStorage at call time
  // to keep request scoping intact under concurrency.
  (globalThis as any).__getRequestContext = () => storage.getStore();
}

export function withRequestContext<T>(req: NextRequest, run: () => Promise<T>): Promise<T> {
  const rid = req.headers.get('x-request-id') || (typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
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
