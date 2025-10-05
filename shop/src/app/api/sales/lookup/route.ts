import { NextResponse } from 'next/server';
import { z } from 'zod';
import { mockDb } from '@/lib/mock/store';
import { getSaleEligibility } from '@/lib/returns/eligibility';

const QuerySchema = z.object({
	receipt: z.string().optional(),
	customer: z.string().optional(),
	phone: z.string().optional(),
	dateFrom: z.string().optional(),
	dateTo: z.string().optional()
});

export async function GET(req: Request) {
	const url = new URL(req.url);
	const q = Object.fromEntries(url.searchParams.entries());
	const parsed = QuerySchema.safeParse(q);
	if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

	const { receipt, customer, dateFrom, dateTo } = parsed.data;
	const list = mockDb.listSales({ receipt: receipt || undefined, customerId: customer || undefined, dateFrom: dateFrom ? Number(dateFrom) : undefined, dateTo: dateTo ? Number(dateTo) : undefined });
	const results = [] as any[];
	for (const s of list.slice(0, 20)) {
		const lines = await getSaleEligibility(s._id);
		results.push({
			saleId: s._id,
			receiptNo: s._id.slice(-6),
			customerId: s.customerId,
			date: s.createdAt,
			lines
		});
	}
	return NextResponse.json({ results });
}


