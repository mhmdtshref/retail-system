import { maskPII } from '@/lib/obs/mask';
import { logger } from '@/lib/obs/logger';

export type ErrorEvent = {
  error: any;
  tags?: Record<string, string>;
  breadcrumbs?: { type: string; message?: string; data?: any; ts?: number }[];
  user?: { idHash?: string; role?: string };
};

export type Provider = 'none'|'sentry-webhook'|'console';

export type ErrorConfig = {
  provider: Provider;
  dsn?: string;
  webhookUrl?: string;
  env?: string;
  release?: string;
  commitSha?: string;
};

let config: ErrorConfig = { provider: 'console', env: process.env.NODE_ENV, release: process.env.RELEASE, commitSha: process.env.VERCEL_GIT_COMMIT_SHA };

export function configureErrors(c: Partial<ErrorConfig>) { config = { ...config, ...c }; }

export async function reportError(ev: ErrorEvent) {
  const payload = {
    level: 'error',
    message: normalizeMessage(ev.error),
    stack: stackFromError(ev.error),
    tags: { env: config.env, release: String(config.release||''), commitSha: String(config.commitSha||''), ...(ev.tags||{}) },
    breadcrumbs: (ev.breadcrumbs||[]).slice(-50).map(b => ({ ...b, data: maskPII(b.data) })),
    user: ev.user,
  };
  if (config.provider === 'none') return;
  if (config.provider === 'console') {
    logger.error({ err: payload.message, tags: payload.tags }, 'error');
    return;
  }
  if (config.provider === 'sentry-webhook' && config.webhookUrl) {
    try {
      await fetch(config.webhookUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    } catch (e) {
      logger.warn({ err: String(e) }, 'error webhook failed');
    }
  }
}

function normalizeMessage(err: any): string {
  if (!err) return 'unknown';
  if (typeof err === 'string') return err.slice(0, 400);
  if (err.message) return String(err.message).slice(0, 400);
  return String(err).slice(0, 400);
}
function stackFromError(err: any): string | undefined {
  if (!err) return undefined;
  if (err.stack && typeof err.stack === 'string') return err.stack.split('\n').slice(0, 12).join('\n');
  return undefined;
}

export function withErrorBoundary<TArgs extends any[], TResult>(handler: (...args: TArgs) => Promise<TResult>) {
  return async (...args: TArgs): Promise<TResult> => {
    try {
      return await handler(...args);
    } catch (error) {
      await reportError({ error });
      throw error;
    }
  };
}
