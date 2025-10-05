import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongo';
import { StockCountSession } from '@/lib/models/StockCountSession';
import { CountSessionPatchSchema } from '@/lib/validators/count';
import { z } from 'zod';
import { Idempotency } from '@/lib/models/Idempotency';

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const { id } = await context.params;
  const doc = await StockCountSession.findById(id).lean();
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ session: doc });
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const idempotencyKey = req.headers.get('Idempotency-Key') || '';
  if (!idempotencyKey) return NextResponse.json({ error: 'Missing Idempotency-Key' }, { status: 400 });
  const existing = await Idempotency.findOne({ key: idempotencyKey }).lean();
  if (existing) return NextResponse.json(existing.result);

  const { id } = await context.params;
  const session = await StockCountSession.findById(id);
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const parsed = CountSessionPatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { items, status } = parsed.data;
  session.updatedBy = req.headers.get('X-User') || 'anonymous';

  // apply item patches with recompute variance
  const map = new Map(session.items.map((i: any) => [i.sku, i]));
  for (const patch of items) {
    let row = map.get(patch.sku);
    if (!row) {
      // if new sku comes in (e.g., upload scope later), initialize onHandAtStart to 0 by default
      row = { sku: patch.sku, onHandAtStart: 0 } as any;
      map.set(patch.sku, row);
    }
    if (typeof patch.counted === 'number') row.counted = patch.counted;
    if (typeof patch.recount === 'boolean') row.recount = patch.recount;
    if (typeof patch.note === 'string') row.note = patch.note;
    const onHand = Number(row.onHandAtStart || 0);
    const counted = Number(row.counted || 0);
    row.variance = counted - onHand;
  }
  session.items = Array.from(map.values());
  if (status) session.status = status as any;
  await session.save();
  const result = { session: session.toObject() };
  await Idempotency.create({ key: idempotencyKey, result });
  return NextResponse.json(result);
}


