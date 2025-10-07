import { mockDb } from '@/lib/mock/store';

export type EligibleLine = {
	sku: string;
	soldQty: number;
	returnedQty: number;
	eligibleQty: number;
	unitPrice?: number;
	taxRateApplied?: number;
};

export async function getEligibleReturnQty(saleId: string, sku: string): Promise<number> {
	// Using mockDb for now; when wired to Mongo, replace with Sales + movements query
	const sale = mockDb.getSale(saleId);
	if (!sale) return 0;
	const sold = sale.lines.find((l) => l.sku === sku)?.qty || 0;
	const returned = mockDb.sumReturnedQtyForSaleSku(saleId, sku);
	return Math.max(0, sold - returned);
}

export async function getSaleEligibility(saleId: string): Promise<EligibleLine[]> {
	const sale = mockDb.getSale(saleId);
	if (!sale) return [];
	return Promise.all(
		sale.lines.map(async (l: any) => {
			const returned = mockDb.sumReturnedQtyForSaleSku(saleId, l.sku);
			const eligible = Math.max(0, l.qty - returned);
			return { sku: l.sku, soldQty: l.qty, returnedQty: returned, eligibleQty: eligible, unitPrice: l.price, taxRateApplied: l.taxRateApplied };
		})
	);
}

export function withinReturnWindow(saleCreatedAt: number | undefined, windowDays: number): boolean {
	if (!saleCreatedAt) return false;
	const now = Date.now();
	const diffDays = Math.floor((now - saleCreatedAt) / (1000 * 60 * 60 * 24));
	return diffDays <= windowDays;
}


