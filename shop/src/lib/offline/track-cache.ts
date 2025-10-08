import { posDb } from '@/lib/db/posDexie';

type TrackSnapshot = { orderId: string; code: string; snapshotJson: any; updatedAt: number };

async function ensureStore(): Promise<DexieTableLike<TrackSnapshot>> {
  const anyDb = posDb as any;
  if (!anyDb.trackCache) {
    const v = anyDb.verno || 9;
    const next = v + 1;
    anyDb.version(next).stores({ trackCache: 'orderId, updatedAt, code' });
    await anyDb.open();
  }
  return anyDb.trackCache as DexieTableLike<TrackSnapshot>;
}

type DexieTableLike<T> = { get: (key: any) => Promise<T | undefined>; put: (val: T) => Promise<any> };

export async function saveTrackSnapshot(input: { orderId: string; code: string; snapshotJson: any }) {
  try {
    const table = await ensureStore();
    await table.put({ orderId: input.orderId, code: input.code, snapshotJson: input.snapshotJson, updatedAt: Date.now() });
  } catch {}
}

export async function loadTrackSnapshot(orderId: string): Promise<TrackSnapshot | null> {
  try {
    const table = await ensureStore();
    const row = await table.get(orderId as any);
    return row || null;
  } catch { return null; }
}

