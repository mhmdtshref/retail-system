import { posDb } from '@/lib/db/posDexie';

export async function cacheSettings(doc: any) {
  try {
    const table: any = (posDb as any).settingsCache || await ensureStore();
    await table.put({ id: 'active', version: doc.version, json: doc, updatedAt: Date.now() });
  } catch {}
}

export async function getCachedSettings(): Promise<any | null> {
  try {
    const table: any = (posDb as any).settingsCache || await ensureStore();
    const row = await table.get('active');
    return row?.json || null;
  } catch { return null; }
}

export async function ensureStore() {
  if (!(posDb as any).settingsCache) {
    // bump schema at runtime (Dexie dynamic opening not ideal but acceptable for client-only)
    const v = (posDb as any).verno || 6;
    const next = v + 1;
    (posDb as any).version(next).stores({ settingsCache: 'id, updatedAt' });
    await (posDb as any).open();
  }
  return (posDb as any).settingsCache;
}

