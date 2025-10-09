import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, requireCan } from '@/lib/policy/api';
import { runSeed } from '@/lib/seeds/index';
import { getIfExists, saveResult } from '@/lib/idempotency';

const postSchema = z.object({
  pack: z.enum(['dev-minimal','demo','test-fixtures','anonymize-staging']),
  flags: z.object({
    wipe: z.boolean().optional(),
    append: z.boolean().optional(),
    location: z.string().optional(),
    arabic: z.boolean().optional(),
    seedRandom: z.number().optional()
  }).optional()
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const canRes = await requireCan(req, auth.user, 'SETTINGS.MANAGE');
  if (canRes !== true) return canRes;

  const body = await req.json();
  const input = postSchema.safeParse(body);
  if (!input.success) return NextResponse.json({ error: { message: input.error.message } }, { status: 400 });

  const { pack, flags } = input.data;
  const idem = req.headers.get('Idempotency-Key') || '';
  if (idem) {
    const existing = await getIfExists<any>(idem);
    if (existing) return NextResponse.json(existing);
  }
  const res = await runSeed(pack, flags || {}, auth.user?._id);
  if (idem) await saveResult(idem, res);
  return NextResponse.json(res);
}
