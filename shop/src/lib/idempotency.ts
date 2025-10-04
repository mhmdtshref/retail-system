import { Idempotency } from '@/lib/models/Idempotency';

export async function getIfExists<T = any>(key: string): Promise<T | null> {
  if (!key) return null;
  const doc = await Idempotency.findOne({ key }).lean();
  return (doc && (doc.result as T)) || null;
}

export async function saveResult<T = any>(key: string, result: T): Promise<void> {
  if (!key) return;
  try {
    await Idempotency.create({ key, result });
  } catch {}
}


