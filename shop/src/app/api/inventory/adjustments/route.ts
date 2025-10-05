import { NextResponse } from 'next/server';
import { z } from 'zod';
import { dbConnect } from '@/lib/db/mongo';
import { StockMovement } from '@/lib/models/StockMovement';
import { StockAdjustment } from '@/lib/models/StockAdjustment';
import { AdjustmentCreateSchema } from '@/lib/validators/adjustment';
import { Idempotency } from '@/lib/models/Idempotency';

const ListQuerySchema = z.object({
  dateFrom: z.coerce.number().optional(),
  dateTo: z.coerce.number().optional(),
  sku: z.string().optional(),
  reason: z.string().optional(),
  user: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50)
});

export async function GET(req: Request) {
  await dbConnect();
  const url = new URL(req.url);
  const parsed = ListQuerySchema.safeParse({
    dateFrom: url.searchParams.get('dateFrom') || undefined,
    dateTo: url.searchParams.get('dateTo') || undefined,
    sku: url.searchParams.get('sku') || undefined,
    reason: url.searchParams.get('reason') || undefined,
    user: url.searchParams.get('user') || undefined,
    page: url.searchParams.get('page') || undefined,
    pageSize: url.searchParams.get('pageSize') || undefined
  });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { dateFrom, dateTo, sku, reason, user, page, pageSize } = parsed.data;
  const q: any = {};
  if (dateFrom || dateTo) q.postedAt = {};
  if (dateFrom) q.postedAt.$gte = new Date(dateFrom!);
  if (dateTo) q.postedAt.$lte = new Date(dateTo!);
  if (user) q.createdBy = user;
  if (reason) q['lines.reason'] = reason;
  if (sku) q['lines.sku'] = sku;
  const total = await StockAdjustment.countDocuments(q);
  const docs = await StockAdjustment.find(q).sort({ postedAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean();
  return NextResponse.json({ total, page, pageSize, adjustments: docs });
}

export async function POST(req: Request) {
  await dbConnect();
  const idempotencyKey = req.headers.get('Idempotency-Key') || '';
  if (!idempotencyKey) return NextResponse.json({ error: 'Missing Idempotency-Key' }, { status: 400 });
  const existing: any = await Idempotency.findOne({ key: idempotencyKey }).lean();
  if (existing && existing.result) return NextResponse.json(existing.result);

  const body = await req.json();
  const parsed = AdjustmentCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { lines, note } = parsed.data;
  const createdBy = req.headers.get('X-User') || 'anonymous';

  // Create header first to capture refId on movements
  const header = await StockAdjustment.create({ lines, note, postedAt: new Date(), createdBy, refMovementIds: [] });
  const createdMoves = [] as any[];
  for (const l of lines) {
    const m = await StockMovement.create({ sku: l.sku, type: 'adjustment', quantity: l.quantity, reason: l.reason, note: l.note || note, refType: 'Adjustment', refId: header._id, createdBy });
    createdMoves.push(m);
  }
  header.refMovementIds = createdMoves.map((m) => m._id);
  await header.save();
  const result = { adjustment: header.toObject(), movements: createdMoves.map((m) => m.toObject()) };
  await Idempotency.create({ key: idempotencyKey, result });
  return NextResponse.json(result);
}


