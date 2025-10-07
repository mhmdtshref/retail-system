import { NextRequest, NextResponse } from 'next/server';
import { ReturnCreateSchema } from '@/lib/validators/return';
import { mockDb } from '@/lib/mock/store';
import { getSaleEligibility, withinReturnWindow } from '@/lib/returns/eligibility';
import { requireAuth, requireCan } from '@/lib/policy/api';

export async function GET(req: Request) {
	const url = new URL(req.url);
	const dateFrom = url.searchParams.get('dateFrom');
	const dateTo = url.searchParams.get('dateTo');
	const list = mockDb.listReturns({ dateFrom: dateFrom ? Number(dateFrom) : undefined, dateTo: dateTo ? Number(dateTo) : undefined });
	return NextResponse.json({ results: list });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
	const idempotencyKey = req.headers.get('Idempotency-Key') || '';
	if (!idempotencyKey) return NextResponse.json({ error: 'Missing Idempotency-Key' }, { status: 400 });
	if (mockDb.has(idempotencyKey)) {
		return NextResponse.json(mockDb.get(idempotencyKey));
	}
	const body = await req.json();
	const parsed = ReturnCreateSchema.safeParse(body);
	if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { saleId, lines, refund, notes, override } = parsed.data;
  if (!override) {
    const allowed = await requireCan(req, auth.user, 'POS.RETURN_EXCHANGE_FINALIZE');
    if (allowed !== true) return allowed;
  }
	const sale = mockDb.getSale(saleId);
	if (!sale) return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
	const settings = { windowDays: 14 };
	const inWindow = withinReturnWindow(sale.createdAt, settings.windowDays);
	if (!inWindow && !override) {
		return NextResponse.json({ error: { message: 'خارج نافذة الإرجاع. يتطلب موافقة المدير.' } }, { status: 400 });
	}
	// Eligibility per line
	const eligibility = await getSaleEligibility(saleId);
	for (const l of lines) {
		const e = eligibility.find((x) => x.sku === l.sku);
		if (!e) return NextResponse.json({ error: { message: `العنصر غير موجود في الفاتورة: ${l.sku}` } }, { status: 400 });
		if (l.qty > e.eligibleQty) return NextResponse.json({ error: { message: `لا يمكن إرجاع كمية أكبر من المسموح (${e.eligibleQty})` } }, { status: 400 });
	}
  const ret = mockDb.createReturn({ saleId, lines: lines.map((l) => ({ sku: l.sku, qty: l.qty, unitPrice: l.unitPrice, reason: l.reason, condition: l.condition })), refund: { method: refund.method, amount: refund.amount, status: refund.status }, notes });
	const result = { returnId: ret._id, rma: ret.rma, movements: ret.refMovementIds };
	mockDb.set(idempotencyKey, result);
	return NextResponse.json(result);
}


