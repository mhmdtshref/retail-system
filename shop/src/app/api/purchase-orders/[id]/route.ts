import { NextResponse } from 'next/server';
import { z } from 'zod';
import { mockDb } from '@/lib/mock/store';

const PatchSchema = z.object({
  supplierId: z.string().optional(),
  lines: z.array(z.object({
    sku: z.string().optional(),
    size: z.string().optional(),
    color: z.string().optional(),
    unitCost: z.number().nonnegative().optional(),
    quantityOrdered: z.number().positive().optional(),
    quantityReceived: z.number().nonnegative().optional()
  })).optional(),
  notes: z.string().optional(),
  status: z.enum(['draft','partial','received','cancelled']).optional()
});

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const po = mockDb.getPO(id);
  if (!po) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ purchaseOrder: po });
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { id } = await context.params;
  const po = mockDb.updatePO(id, parsed.data as any);
  if (!po) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}

