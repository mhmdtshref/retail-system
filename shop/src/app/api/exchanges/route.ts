import { NextResponse } from 'next/server';
import { ExchangeCreateSchema } from '@/lib/validators/exchange';
import { mockDb } from '@/lib/mock/store';
import { getSaleEligibility, withinReturnWindow } from '@/lib/returns/eligibility';

export async function GET(req: Request) {
	const url = new URL(req.url);
	const dateFrom = url.searchParams.get('dateFrom');
	const dateTo = url.searchParams.get('dateTo');
	const list = mockDb.listExchanges({ dateFrom: dateFrom ? Number(dateFrom) : undefined, dateTo: dateTo ? Number(dateTo) : undefined });
	return NextResponse.json({ results: list });
}

export async function POST(req: Request) {
	const idempotencyKey = req.headers.get('Idempotency-Key') || '';
	if (!idempotencyKey) return NextResponse.json({ error: 'Missing Idempotency-Key' }, { status: 400 });
	if (mockDb.has(idempotencyKey)) {
		return NextResponse.json(mockDb.get(idempotencyKey));
	}
	const body = await req.json();
	const parsed = ExchangeCreateSchema.safeParse(body);
	if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
	const { originalSaleId, returnLines, newLines, settlement, notes, override } = parsed.data;
	const sale = mockDb.getSale(originalSaleId);
	if (!sale) return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
	const settings = { windowDays: 14 };
	const inWindow = withinReturnWindow(sale.createdAt, settings.windowDays);
	if (!inWindow && !override) {
		return NextResponse.json({ error: { message: 'خارج نافذة الإرجاع. يتطلب موافقة المدير.' } }, { status: 400 });
	}
	const eligibility = await getSaleEligibility(originalSaleId);
	for (const l of returnLines) {
		const e = eligibility.find((x) => x.sku === l.sku);
		if (!e) return NextResponse.json({ error: { message: `العنصر غير موجود في الفاتورة: ${l.sku}` } }, { status: 400 });
		if (l.qty > e.eligibleQty) return NextResponse.json({ error: { message: `لا يمكن إرجاع كمية أكبر من المسموح (${e.eligibleQty})` } }, { status: 400 });
	}
	// Settlement sanity
	const returnedTotal = returnLines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
	const newTotal = newLines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
	const shopOwes = Math.max(0, returnedTotal - newTotal);
	const customerOwes = Math.max(0, newTotal - returnedTotal);
	if (Math.abs(shopOwes - settlement.shopOwes) > 0.01 || Math.abs(customerOwes - settlement.customerOwes) > 0.01) {
		return NextResponse.json({ error: { message: 'حساب التسوية غير متطابق' } }, { status: 400 });
	}
  const ex = mockDb.createExchange({ originalSaleId, returnLines, newLines, settlement: { ...settlement, customerOwes, shopOwes }, notes });
	const result = { exchangeId: ex._id, movements: ex.refMovementIds, payment: customerOwes > 0 ? { method: settlement.paidMethod, amount: customerOwes } : undefined, refund: shopOwes > 0 ? { method: settlement.refundMethod, amount: shopOwes } : undefined };
	mockDb.set(idempotencyKey, result);
	return NextResponse.json(result);
}


