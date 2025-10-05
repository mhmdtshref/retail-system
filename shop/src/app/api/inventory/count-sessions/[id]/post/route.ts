import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/mongo';
import { StockCountSession } from '@/lib/models/StockCountSession';
import { StockMovement } from '@/lib/models/StockMovement';
import { Idempotency } from '@/lib/models/Idempotency';

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const idempotencyKey = _req.headers.get('Idempotency-Key') || '';
  if (!idempotencyKey) return NextResponse.json({ error: 'Missing Idempotency-Key' }, { status: 400 });
  const existing = await Idempotency.findOne({ key: idempotencyKey }).lean();
  if (existing) return NextResponse.json(existing.result);

  const { id } = await context.params;
  const session = await StockCountSession.findById(id);
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (session.status === 'open') return NextResponse.json({ error: 'Session must be in reviewing state' }, { status: 400 });
  const unresolved = (session.items || []).filter((i: any) => i.recount);
  if (unresolved.length) return NextResponse.json({ error: 'Unresolved recount flags present' }, { status: 400 });

  const moves = [] as any[];
  const createdBy = _req.headers.get('X-User') || 'anonymous';
  for (const it of session.items as any[]) {
    const variance = Number(it.variance || 0);
    if (!variance) continue;
    const m = await StockMovement.create({ sku: it.sku, type: 'adjustment', quantity: variance, reason: 'جرد', note: it.note, refType: 'CountSession', refId: session._id, createdBy });
    moves.push(m);
  }
  session.status = 'posted';
  session.postedAt = new Date();
  session.refMovementIds = moves.map((m) => m._id);
  await session.save();

  const result = { session: session.toObject(), movements: moves.map((m) => m.toObject()) };
  await Idempotency.create({ key: idempotencyKey, result });
  return NextResponse.json(result);
}


