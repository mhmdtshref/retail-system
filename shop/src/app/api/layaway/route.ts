import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dbConnect } from '@/lib/db/mongo';
import { getIfExists, saveResult } from '@/lib/idempotency';
import { requireAuth, requireCan } from '@/lib/policy/api';
import { Layaway } from '@/lib/models/Layaway';
import { LayawayCreateSchema, LayawayListQuery } from '@/lib/validators/layaway';
import { createLayaway, listLayaways } from '@/lib/layaway/service';

export async function GET(req: NextRequest) {
  await dbConnect();
  const url = new URL(req.url);
  const parsed = LayawayListQuery.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { items } = await listLayaways(parsed.data);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const allowed = await requireCan(req, auth.user, 'POS.SALE');
  if (allowed !== true) return allowed;
  const idk = req.headers.get('Idempotency-Key') || '';
  const existing = await getIfExists(idk);
  if (existing) return NextResponse.json(existing);
  const body = await req.json();
  const parsed = LayawayCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  try {
    const res = await createLayaway({ ...parsed.data, actorId: (auth as any).user?.id });
    const out = { layaway: res };
    await saveResult(idk, out);
    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ error: { message: e?.message || 'Failed' } }, { status: 400 });
  }
}

