"use client";
import { useMemo, useState } from 'react';
import { enqueueReturnCreate } from '@/lib/outbox';
import { uuid } from '@/lib/pos/idempotency';

type SaleLine = { sku: string; soldQty: number; returnedQty: number; eligibleQty: number; unitPrice?: number };
type SaleSummary = { saleId: string; receiptNo: string; date?: number; lines: SaleLine[] };

const reasons = ['غير مناسب','مقاس غير صحيح','تالف','تغيير رأي'];
const conditions = ['غير مفتوح','مفتوح','تالف'];

export function ReturnBuilder({ sale }: { sale: SaleSummary }) {
	const [qtyBySku, setQtyBySku] = useState<Record<string, number>>({});
	const [reasonBySku, setReasonBySku] = useState<Record<string, string>>({});
	const [conditionBySku, setConditionBySku] = useState<Record<string, string>>({});
	const [method, setMethod] = useState<'cash'|'card'|'store_credit'>('cash');
	const [notes, setNotes] = useState('');
	const total = useMemo(() => sale.lines.reduce((s, l) => s + (qtyBySku[l.sku] || 0) * (l.unitPrice || 0), 0), [sale.lines, qtyBySku]);

	function setQty(sku: string, val: number, max: number) {
		const q = Math.max(0, Math.min(max, Math.floor(val)));
		setQtyBySku((p) => ({ ...p, [sku]: q }));
	}

	async function confirm() {
		const lines = sale.lines
			.filter((l) => (qtyBySku[l.sku] || 0) > 0)
			.map((l) => ({ sku: l.sku, qty: qtyBySku[l.sku], unitPrice: l.unitPrice || 0, reason: reasonBySku[l.sku] || reasons[0], condition: conditionBySku[l.sku] }));
		if (!lines.length) return;
    const localId = uuid();
    await enqueueReturnCreate({ localId, saleId: sale.saleId, lines, refund: { method, amount: total }, notes });
    try { await fetch('/api/inventory/availability/bulk', { method: 'GET' }); } catch {}
    alert('تم إنشاء طلب إرجاع. سيتم المزامنة عند توفر الإنترنت.');
	}

	return (
		<div className="space-y-3">
			<table className="w-full text-right">
				<thead>
					<tr className="text-sm text-gray-600">
						<th className="p-2">الصنف</th>
						<th className="p-2">المتاح</th>
						<th className="p-2">السعر</th>
						<th className="p-2">الكمية</th>
						<th className="p-2">السبب</th>
						<th className="p-2">الحالة</th>
					</tr>
				</thead>
				<tbody>
					{sale.lines.map((l) => {
						const q = qtyBySku[l.sku] || 0;
						const max = l.eligibleQty;
						return (
							<tr key={l.sku} className="border-t">
								<td className="p-2"><bdi dir="ltr">{l.sku}</bdi></td>
								<td className="p-2 text-sm">{max}</td>
								<td className="p-2 text-sm">{(l.unitPrice || 0).toLocaleString('ar-SA')}</td>
								<td className="p-2">
									<input type="number" min={0} max={max} value={q} onChange={(e) => setQty(l.sku, Number(e.target.value), max)} className="w-20 border rounded px-2 py-1" />
								</td>
								<td className="p-2">
									<select value={reasonBySku[l.sku] || ''} onChange={(e) => setReasonBySku((p) => ({ ...p, [l.sku]: e.target.value }))} className="border rounded px-2 py-1">
										<option value="" disabled>اختر</option>
										{reasons.map((r) => <option key={r} value={r}>{r}</option>)}
									</select>
								</td>
								<td className="p-2">
									<select value={conditionBySku[l.sku] || ''} onChange={(e) => setConditionBySku((p) => ({ ...p, [l.sku]: e.target.value }))} className="border rounded px-2 py-1">
										<option value="" disabled>اختر</option>
										{conditions.map((c) => <option key={c} value={c}>{c}</option>)}
									</select>
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
			<div className="flex items-center gap-3">
				<div>طريقة الاسترداد:</div>
				<select value={method} onChange={(e) => setMethod(e.target.value as any)} className="border rounded px-2 py-1">
					<option value="cash">نقدًا</option>
					<option value="card">بطاقة</option>
					<option value="store_credit">رصيد متجر</option>
				</select>
				<div className="ml-auto">الإجمالي: {total.toLocaleString('ar-SA')}</div>
			</div>
			<textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ملاحظات" className="w-full border rounded p-2" />
			<button onClick={confirm} className="px-4 py-2 bg-green-600 text-white rounded">تأكيد الإرجاع</button>
		</div>
	);
}


