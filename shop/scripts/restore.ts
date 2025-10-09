#!/usr/bin/env tsx
import { restoreCollections } from '@/lib/backup/restorer';

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
  const src = String(args.src || args.source || 'local://').trim();
  let source: any;
  if (src.startsWith('s3://')) {
    const rest = src.slice(5);
    const [bucket, ...px] = rest.split('/');
    source = { type: 's3', bucket, prefix: px.join('/') };
  } else {
    const p = src.replace(/^local:\/\//, '') || '';
    source = { type: 'local', path: p || undefined };
  }
  const collections = String(args.collections || '').split(',').filter(Boolean);
  const passphrase = typeof args.pass === 'string' ? String(args.pass) : undefined;
  const dryRun = !!args['dry-run'];

  const res = await restoreCollections({ source, collections: collections.length ? collections : undefined, passphrase, dryRun });
  console.log(JSON.stringify(res, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
