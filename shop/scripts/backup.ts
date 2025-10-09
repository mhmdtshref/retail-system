#!/usr/bin/env tsx
import { exportCollections } from '@/lib/backup/exporter';

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
  const collections = String(args.collections || '').split(',').filter(Boolean);
  const dest = String(args.dest || args.destination || 'local://').trim();
  let destination: any;
  if (dest.startsWith('s3://')) {
    const rest = dest.slice(5);
    const [bucket, ...px] = rest.split('/');
    destination = { type: 's3', bucket, prefix: px.join('/') };
  } else {
    const p = dest.replace(/^local:\/\//, '') || '';
    destination = { type: 'local', path: p || undefined };
  }
  const passphrase = typeof args.pass === 'string' ? String(args.pass) : undefined;

  if (collections.length === 0) {
    console.error('Usage: pnpm backup --collections=User,Product --dest local://storage/backups [--pass=pass]');
    process.exit(2);
  }

  const res = await exportCollections({ collections, destination, passphrase, env: process.env.NODE_ENV, appVersion: process.env.npm_package_version });
  console.log(JSON.stringify(res, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
