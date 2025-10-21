// Avoid importing the server-only context module in client bundles.
// Instead, read from a global getter that the server module attaches.
function getCtxSafe(): any | undefined {
  try {
    if (typeof globalThis !== 'undefined' && (globalThis as any).__getRequestContext) {
      return (globalThis as any).__getRequestContext();
    }
  } catch {}
  return undefined;
}
import { maskPII } from '@/lib/obs/mask';
import { getObsRuntimeConfig } from '@/lib/obs/config';

export type LogLevel = 'debug'|'info'|'warn'|'error';

export type LogMeta = Record<string, unknown> & { ctx?: any };

const levelWeights: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
function getLevel(): LogLevel {
  const envL = (process.env.LOG_LEVEL || 'info').toLowerCase();
  if (['debug','info','warn','error'].includes(envL)) return envL as LogLevel;
  return 'info';
}

function shouldSample(level: LogLevel, route?: string): boolean {
  if (level === 'error' || level === 'warn') return true;
  const s = Math.max(0, Math.min(1, getObsRuntimeConfig().sampling.info ?? Number(process.env.LOG_SAMPLE_INFO || '1')));
  const hash = Math.abs(hashString(`${Date.now()}${route||''}${Math.random()}`));
  return (hash % 10) < Math.floor((s * 10));
}

export const logger = {
  child(bindings: Record<string, unknown>) {
    return createLogger(bindings);
  },
  debug(meta: LogMeta, msg?: string) { createLogger().debug(meta, msg); },
  info(meta: LogMeta, msg?: string) { createLogger().info(meta, msg); },
  warn(meta: LogMeta, msg?: string) { createLogger().warn(meta, msg); },
  error(meta: LogMeta, msg?: string) { createLogger().error(meta, msg); },
};

function createLogger(bindings?: Record<string, unknown>) {
  const base = { service: process.env.SERVICE_NAME || 'shop', env: process.env.NODE_ENV };
  function log(level: LogLevel, meta: LogMeta = {}, msg?: string) {
    const min = getLevel();
    if (levelWeights[level] < levelWeights[min]) return;
    const ctx = getCtxSafe();
    const toLog: any = { level, time: new Date().toISOString(), ...base };
    if (ctx) {
      toLog.requestId = ctx.requestId;
      toLog.correlationId = ctx.correlationId;
      toLog.user = ctx.user;
      toLog.method = ctx.method; toLog.path = ctx.path;
    }
    if (bindings) Object.assign(toLog, bindings);
    if (meta && Object.keys(meta).length) Object.assign(toLog, maskPII(meta));
    if (msg) toLog.msg = msg;

    const route = ctx?.path;
    if (!shouldSample(level, route)) return;

    try {
      console.log(JSON.stringify(toLog));
    } catch {}
  }
  return {
    debug(meta: LogMeta = {}, msg?: string) { log('debug', meta, msg); },
    info(meta: LogMeta = {}, msg?: string) { log('info', meta, msg); },
    warn(meta: LogMeta = {}, msg?: string) { log('warn', meta, msg); },
    error(meta: LogMeta = {}, msg?: string) { log('error', meta, msg); },
  };
}

function hashString(s: string): number {
  let h = 0; for (let i = 0; i < s.length; i++) { h = ((h<<5)-h) + s.charCodeAt(i); h |= 0; }
  return h;
}
