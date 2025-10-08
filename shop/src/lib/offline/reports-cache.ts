import { POSDexie, posDb } from '@/lib/db/posDexie';

export type ReportCacheEntry = { key: string; snapshotJson: any; updatedAt: number; ttlSec: number };

export async function ensureReportsCacheTable(db: POSDexie = posDb) {
  // Upgrade: add version 10 with reportsCache store
  try {
    // Dexie schema changes require version bump; if not existing, extending at runtime is not trivial.
    // Consumers can store in customerDrafts as fallback, but we add helper interface here for future versions.
    return db;
  } catch {
    return db;
  }
}

export async function getCachedReport(key: string): Promise<ReportCacheEntry | null> {
  try {
    const anyDb: any = posDb as any;
    const table = anyDb.reportsCache as any;
    if (!table) return null;
    const row = await table.get(key);
    if (!row) return null;
    const now = Date.now();
    if (row.updatedAt + (row.ttlSec * 1000) < now) return null;
    return row as ReportCacheEntry;
  } catch { return null; }
}

export async function setCachedReport(entry: ReportCacheEntry): Promise<void> {
  try {
    const anyDb: any = posDb as any;
    const table = anyDb.reportsCache as any;
    if (!table) return;
    await table.put({ ...entry });
  } catch {}
}

export function computeReportKey(kind: 'daily'|'aging'|'valuation', params: any): string {
  function stable(obj: any): string {
    if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
    if (Array.isArray(obj)) return '[' + obj.map((v) => stable(v)).join(',') + ']';
    const keys = Object.keys(obj).sort();
    return '{' + keys.map((k) => JSON.stringify(k) + ':' + stable(obj[k])).join(',') + '}';
  }
  return `${kind}:${stable(params)}`;
}

