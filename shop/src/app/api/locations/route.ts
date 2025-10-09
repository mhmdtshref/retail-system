import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireCan } from '@/lib/policy/api';
import { listLocations, upsertLocation } from '@/lib/locations/service';
import { LocationCreateSchema } from '@/lib/validators/location';
import { Idempotency } from '@/lib/models/Idempotency';

export async function GET() {
  const list = await listLocations();
  return NextResponse.json({ locations: list });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const allowed = await requireCan(req, auth.user, 'INVENTORY.LOCATIONS_MANAGE');
  if (allowed !== true) return allowed;
  const idempotencyKey = req.headers.get('Idempotency-Key') || '';
  if (!idempotencyKey) return NextResponse.json({ error: 'Missing Idempotency-Key' }, { status: 400 });
  const existing: any = await Idempotency.findOne({ key: idempotencyKey }).lean();
  if (existing?.result) return NextResponse.json(existing.result);
  const body = await req.json();
  const parsed = LocationCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const res = await upsertLocation(parsed.data);
  const result = { location: res.location };
  await Idempotency.create({ key: idempotencyKey, result });
  return NextResponse.json(result);
}
