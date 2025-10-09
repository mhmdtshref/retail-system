#!/usr/bin/env tsx
import { applyMigrations, listMigrations, revertMigrations, type Migration } from '@/lib/migrations/runner';
import { migrationEnsureIndexes } from '@/migrations/2025-10-09_ensure_indexes';

const registry: Migration[] = [
  migrationEnsureIndexes,
];

async function main() {
  const cmd = process.argv[2] || 'status';
  if (cmd === 'status') {
    const list = await listMigrations(registry);
    console.log(JSON.stringify(list.map(m => ({ version: m.version, title: m.title, applied: !!(m as any).state?.appliedAt })), null, 2));
  } else if (cmd === 'up') {
    const toVersion = process.argv.find(a => a.startsWith('--to='))?.split('=')[1];
    const dryRun = !!process.argv.find(a => a === '--dry-run');
    await applyMigrations(registry, toVersion, dryRun);
  } else if (cmd === 'down') {
    const stepsStr = process.argv.find(a => a.startsWith('--steps='))?.split('=')[1];
    const steps = stepsStr ? parseInt(stepsStr, 10) : 1;
    const dryRun = !!process.argv.find(a => a === '--dry-run');
    await revertMigrations(registry, steps, dryRun);
  } else {
    console.error('Usage: pnpm migrate [status|up|down] [--to=VERSION|--steps=N] [--dry-run]');
    process.exit(2);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
