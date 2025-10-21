import { NextRequest, NextResponse } from 'next/server';
// Server-only imports
import { withRequestContext, setUserContext } from '@/lib/obs/context';
import { logger } from '@/lib/obs/logger';
import { recordHttp } from '@/lib/obs/metrics';
import { getSessionUserFromRequest } from '@/lib/auth/session';

export function withObservability(handler: (req: NextRequest, ...rest: any[]) => Promise<NextResponse>) {
  return async (req: NextRequest, ...rest: any[]) => {
    const started = Date.now();
    return withRequestContext(req, async () => {
      try {
        const user = await getSessionUserFromRequest(req).catch(()=>null);
        if (user) setUserContext({ id: user.id, role: user.role });
        const res = await handler(req, ...rest);
        const ctx = (globalThis as any).__getRequestContext ? (globalThis as any).__getRequestContext() : undefined;
        const dur = Date.now() - started;
        recordHttp(ctx?.path || '', req.method, res.status || 200, dur);
        if (dur >= Number(process.env.OBS_SLOW_MS || '1000')) {
          logger.warn({ dur, route: ctx?.path, method: req.method, status: res.status }, 'request slow');
        } else {
          logger.info({ dur, route: ctx?.path, method: req.method, status: res.status }, 'request');
        }
        return res;
      } catch (error) {
        const ctx = (globalThis as any).__getRequestContext ? (globalThis as any).__getRequestContext() : undefined;
        logger.error({ route: ctx?.path, method: req.method, err: String((error as any)?.message || error) }, 'handler error');
        throw error;
      }
    });
  };
}
