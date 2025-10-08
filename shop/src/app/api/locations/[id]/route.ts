import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireCan } from '@/lib/policy/api';
import { LocationUpdateSchema } from '@/lib/validators/location';
import { upsertLocation } from '@/lib/locations/service';
import { Idempotency } from '@/lib/models/Idempotency';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const allowed = await requireCan(req, auth.user, 'INVENTORY.LOCATIONS_MANAGE');
  if (allowed !== true) return allowed;
  const idempotencyKey = req.headers.get('Idempotency-Key') || '';
  if (!idempotencyKey) return NextResponse.json({ error: 'Missing Idempotency-Key' }, { status: 400 });
  const existing: any = await Idempotency.findOne({ key: idempotencyKey }).lean();
  if (existing?.result) return NextResponse.json(existing.result);
  const body = await req.json();
  const parsed = LocationUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const res = await upsertLocation(parsed.data, params.id);
  const result = { location: res.location };
  await Idempotency.create({ key: idempotencyKey, result });
  return NextResponse.json(result);
}
