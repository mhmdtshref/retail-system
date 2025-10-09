import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, requireCan } from '@/lib/policy/api';
import { minRole } from '@/lib/policy/guard';
import { getIfExists, saveResult } from '@/lib/idempotency';
import { restoreCollections } from '@/lib/backup/restorer';

const postSchema = z.object({
  source: z.object({ type: z.enum(['local','s3']), path: z.string().optional(), bucket: z.string().optional(), prefix: z.string().optional() }),
  collections: z.array(z.string()).optional(),
  passphrase: z.string().optional(),
  dryRun: z.boolean().optional()
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const canRes = await requireCan(req, auth.user, 'SETTINGS.MANAGE');
  if (canRes !== true) return canRes;
  if (!minRole(auth.user, 'owner')) {
    return NextResponse.json({ error: { message: 'استعادة البيانات تتطلب صلاحية المالك' } }, { status: 403 });
  }

  const body = await req.json();
  const input = postSchema.safeParse(body);
  if (!input.success) return NextResponse.json({ error: { message: input.error.message } }, { status: 400 });

  const { source, collections, passphrase, dryRun } = input.data;
  const idem = req.headers.get('Idempotency-Key') || '';
  if (idem) {
    const existing = await getIfExists<any>(idem);
    if (existing) return NextResponse.json(existing);
  }
  const res = await restoreCollections({ source, collections, passphrase, dryRun }, auth.user?._id);
  if (idem) await saveResult(idem, res);
  return NextResponse.json(res);
}
