import { NextResponse } from 'next/server';
import { z } from 'zod';
import { mockDb } from '@/lib/mock/store';
import { getProvider } from '@/lib/delivery';

const PostSchema = z.object({ saleId: z.string() });

export async function POST(req: Request) {
  const idempotencyKey = req.headers.get('Idempotency-Key') || '';
  if (!idempotencyKey) return NextResponse.json({ error: 'Missing Idempotency-Key' }, { status: 400 });
  if (mockDb.has(idempotencyKey)) {
    return NextResponse.json(mockDb.get(idempotencyKey));
  }
  const body = await req.json();
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { saleId } = parsed.data;
  const sale = mockDb.getSale(saleId);
  if (!sale) return NextResponse.json({ error: 'Sale not found' }, { status: 404 });

  const provider = getProvider();
  const created = await provider.createShipment({ saleId });

  const shipment = mockDb.createShipment({
    saleId,
    provider: 'mock',
    externalId: created.externalId,
    labelUrl: created.labelUrl,
    policyUrl: created.policyUrl,
    toAddress: undefined,
    items: sale.lines.map((l) => ({ sku: l.sku, qty: l.qty })),
    webhookSignatureSecret: 'mock-secret'
  });

  const result = { shipmentId: shipment._id, externalId: shipment.externalId, labelUrl: shipment.labelUrl, policyUrl: shipment.policyUrl };
  mockDb.set(idempotencyKey, result);
  return NextResponse.json(result);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.getAll('status') as any;
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const search = searchParams.get('q') || undefined;
  const list = mockDb.listShipments({ status: status && status.length ? status : undefined, dateFrom: dateFrom ? Number(dateFrom) : undefined, dateTo: dateTo ? Number(dateTo) : undefined, search });
  return NextResponse.json({ shipments: list });
}



