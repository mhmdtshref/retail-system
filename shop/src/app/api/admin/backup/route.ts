import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongo';
import { z } from 'zod';
import { requireAuth, requireCan } from '@/lib/policy/api';
import { getIfExists, saveResult } from '@/lib/idempotency';
import { BackupJob } from '@/lib/models/BackupJob';
import { exportCollections } from '@/lib/backup/exporter';

const postSchema = z.object({
  collections: z.array(z.string()).min(1),
  destination: z.object({ type: z.enum(['local','s3']), path: z.string().optional(), bucket: z.string().optional(), prefix: z.string().optional() }),
  passphrase: z.string().optional()
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const canRes = await requireCan(req, auth.user, 'SETTINGS.MANAGE');
  if (canRes !== true) return canRes;

  const body = await req.json();
  const input = postSchema.safeParse(body);
  if (!input.success) return NextResponse.json({ error: { message: input.error.message } }, { status: 400 });

  const { collections, destination, passphrase } = input.data;
  const idem = req.headers.get('Idempotency-Key') || '';
  if (idem) {
    const existing = await getIfExists<any>(idem);
    if (existing) return NextResponse.json(existing);
  }
  const res = await exportCollections({ collections, destination, passphrase, appVersion: process.env.npm_package_version, env: process.env.NODE_ENV }, auth.user?._id);
  if (idem) await saveResult(idem, res);
  return NextResponse.json(res);
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const canRes = await requireCan(req, auth.user, 'SETTINGS.MANAGE');
  if (canRes !== true) return canRes;
  await dbConnect();
  const jobs = await BackupJob.find({ kind: 'backup' }).sort({ createdAt: -1 }).limit(50).lean();
  return NextResponse.json({ jobs });
}
