import mongoose from 'mongoose';
import { dbConnect } from '@/lib/db/mongo';
import { MigrationState } from '@/lib/models/MigrationState';
import { MigrationLock } from '@/lib/models/MigrationLock';

export type Ctx = { db: typeof mongoose; dryRun: boolean; logger: (msg: string) => void };
export type Migration = { version: string; title: string; up(ctx: Ctx): Promise<void>; down(ctx: Ctx): Promise<void> };

async function acquireLock(owner: string): Promise<boolean> {
  try {
    await MigrationLock.create({ _id: 'migration-lock', owner });
    return true;
  } catch {
    return false;
  }
}

async function releaseLock() {
  await MigrationLock.deleteOne({ _id: 'migration-lock' });
}

export async function listMigrations(registry: Migration[]) {
  await dbConnect();
  const states = await MigrationState.find({}).lean();
  const merged = registry.map((m) => ({ ...m, state: states.find((s) => s._id === m.version) }));
  return merged;
}

export async function applyMigrations(registry: Migration[], toVersion?: string, dryRun = false) {
  await dbConnect();
  const ok = await acquireLock(`pid:${process.pid}`);
  if (!ok) throw new Error('Migration locked');
  const logger = (m: string) => console.log('[migration]', m);
  try {
    const states = await MigrationState.find({}).lean();
    const pending = registry.filter((m) => !states.find((s) => s._id === m.version || s.appliedAt)).sort((a,b) => a.version.localeCompare(b.version));
    const targetIdx = toVersion ? pending.findIndex((m) => m.version === toVersion) : pending.length - 1;
    const toApply = targetIdx >= 0 ? pending.slice(0, targetIdx + 1) : pending;

    for (const m of toApply) {
      const start = Date.now();
      if (!dryRun) await MigrationState.updateOne({ _id: m.version }, { _id: m.version, name: m.title, hash: 'n/a' }, { upsert: true });
      logger(`Applying ${m.version} ${m.title}`);
      await m.up({ db: mongoose, dryRun, logger });
      const durationMs = Date.now() - start;
      if (!dryRun) await MigrationState.updateOne({ _id: m.version }, { appliedAt: new Date(), durationMs });
    }
  } finally {
    await releaseLock();
  }
}

export async function revertMigrations(registry: Migration[], steps = 1, dryRun = false) {
  await dbConnect();
  const ok = await acquireLock(`pid:${process.pid}`);
  if (!ok) throw new Error('Migration locked');
  const logger = (m: string) => console.log('[migration]', m);
  try {
    const states = await MigrationState.find({ appliedAt: { $exists: true } }).sort({ _id: -1 }).lean();
    const toRevert = states.slice(0, steps);
    const byVersion = Object.fromEntries(registry.map((m) => [m.version, m] as const));

    for (const s of toRevert) {
      const m = byVersion[s._id];
      if (!m) continue;
      logger(`Reverting ${m.version} ${m.title}`);
      await m.down({ db: mongoose, dryRun, logger });
      if (!dryRun) await MigrationState.updateOne({ _id: m.version }, { $unset: { appliedAt: 1 } });
    }
  } finally {
    await releaseLock();
  }
}
