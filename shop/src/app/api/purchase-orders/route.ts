import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { mockDb } from '@/lib/mock/store';
import { requireAuth, requireCan } from '@/lib/policy/api';

const CreateSchema = z.object({
  supplierId: z.string(),
  poNumber: z.string().optional(),
  lines: z.array(z.object({
    sku: z.string().optional(),
    size: z.string().optional(),
    color: z.string().optional(),
    unitCost: z.number().nonnegative().optional(),
    quantityOrdered: z.number().positive().optional(),
    quantityReceived: z.number().nonnegative().optional()
  })).optional(),
  notes: z.string().optional()
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get('status') as any;
  const supplierId = url.searchParams.get('supplier') || undefined;
  const search = url.searchParams.get('search') || undefined;
  const list = mockDb.listPOs({ status: status || undefined, supplierId, search });
  return NextResponse.json({ purchaseOrders: list });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const allowed = await requireCan(req, auth.user, 'INVENTORY.COUNT_POST');
  if (allowed !== true) return allowed;
  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const po = mockDb.createPO(parsed.data);
  return NextResponse.json({ _id: po._id, poNumber: po.poNumber });
}

