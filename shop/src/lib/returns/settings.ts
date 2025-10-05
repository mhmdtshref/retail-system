export type ReturnsSettings = { windowDays: number; reasons: string[]; finalSaleSkus: string[] };

const g = globalThis as unknown as { __returnsSettings?: ReturnsSettings };

export function getReturnsSettings(): ReturnsSettings {
	if (!g.__returnsSettings) {
		g.__returnsSettings = { windowDays: 14, reasons: ['غير مناسب','مقاس غير صحيح','تالف','تغيير رأي'], finalSaleSkus: [] };
	}
	return g.__returnsSettings!;
}

export function updateReturnsSettings(patch: Partial<ReturnsSettings>): ReturnsSettings {
	const cur = getReturnsSettings();
	const next: ReturnsSettings = { ...cur, ...patch };
	g.__returnsSettings = next;
	return next;
}


