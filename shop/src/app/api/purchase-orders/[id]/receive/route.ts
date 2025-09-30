import { NextResponse } from 'next/server';
import { z } from 'zod';
import { mockDb } from '@/lib/mock/store';

const BodySchema = z.object({
  lines: z.array(z.object({
    sku: z.string(),
    quantity: z.number().positive(),
    unitCost: z.number().nonnegative().optional()
  }))
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const po = mockDb.getPO(params.id);
  if (!po) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let anyReceived = false;
  for (const l of parsed.data.lines) {
    mockDb.addMovement({ sku: l.sku, type: 'purchase_in', quantity: l.quantity, unitCost: l.unitCost, refType: 'PO', refId: po._id });
    anyReceived = true;
  }
  if (anyReceived) {
    const newStatus: typeof po.status = 'received'; // simple for now; could be 'partial'
    mockDb.updatePO(po._id, { status: newStatus, receivedAt: Date.now() } as any);
  }
  return NextResponse.json({ ok: true });
}

