#!/usr/bin/env tsx
import { runSeed } from '@/lib/seeds/index';

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const args: Record<string, string | boolean> = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      args[k] = v ?? true;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const pack = (args.pack as string) || 'dev-minimal';
  const flags: any = {
    wipe: !!args.wipe,
    append: !!args.append,
    location: args.location || undefined,
    arabic: args.arabic === 'false' ? false : true,
    seedRandom: args['seed-random'] ? Number(args['seed-random']) : undefined
  };
  const res = await runSeed(pack as any, flags);
  console.log(JSON.stringify(res, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });

