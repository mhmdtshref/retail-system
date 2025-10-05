"use client";
import { useMemo, useState } from 'react';
import { Search } from '@/components/pos/Search';
import { enqueueExchangeCreate } from '@/lib/outbox';
import { uuid } from '@/lib/pos/idempotency';

type SaleLine = { sku: string; soldQty: number; returnedQty: number; eligibleQty: number; unitPrice?: number };
type SaleSummary = { saleId: string; receiptNo: string; date?: number; lines: SaleLine[] };

export function ExchangeBuilder({ sale }: { sale: SaleSummary }) {
	const [step, setStep] = useState<1|2|3>(1);
	const [ret, setRet] = useState<Record<string, number>>({});
	const [cart, setCart] = useState<Array<{ sku: string; qty: number; unitPrice: number }>>([]);
	const [paidMethod, setPaidMethod] = useState<'cash'|'card'|'store_credit'|''>('');
	const [refundMethod, setRefundMethod] = useState<'cash'|'card'|'store_credit'|''>('');

	const returnedTotal = useMemo(() => sale.lines.reduce((s, l) => s + (ret[l.sku] || 0) * (l.unitPrice || 0), 0), [sale.lines, ret]);
	const newTotal = useMemo(() => cart.reduce((s, l) => s + l.qty * l.unitPrice, 0), [cart]);
	const shopOwes = Math.max(0, returnedTotal - newTotal);
	const customerOwes = Math.max(0, newTotal - returnedTotal);

	function addToCart(line: { sku: string; name: string; price: number; qty?: number }) {
		setCart((prev) => {
			const idx = prev.findIndex((x) => x.sku === line.sku);
			if (idx >= 0) {
				const copy = [...prev];
				copy[idx] = { ...copy[idx], qty: copy[idx].qty + (line.qty || 1) };
				return copy;
			}
			return [...prev, { sku: line.sku, qty: line.qty || 1, unitPrice: line.price }];
		});
	}

	async function finalize() {
		const returnLines = sale.lines.filter((l) => (ret[l.sku] || 0) > 0).map((l) => ({ sku: l.sku, qty: ret[l.sku], unitPrice: l.unitPrice || 0, reason: 'استبدال' }));
		const newLines = cart.map((c) => ({ sku: c.sku, qty: c.qty, unitPrice: c.unitPrice }));
		if (!returnLines.length || !newLines.length) return;
    const localId = uuid();
    await enqueueExchangeCreate({ localId, originalSaleId: sale.saleId, returnLines, newLines, settlement: { customerOwes, shopOwes, paidMethod: customerOwes > 0 ? (paidMethod as any) : undefined, refundMethod: shopOwes > 0 ? (refundMethod as any) : undefined } });
    try { await fetch('/api/inventory/availability/bulk', { method: 'GET' }); } catch {}
    alert('تم إنشاء الاستبدال. سيتم المزامنة عند توفر الإنترنت.');
	}

	return (
		<div className="space-y-4">
			<div className="flex gap-2">
				<button className={`px-3 py-1 rounded ${step===1?'bg-black text-white':'bg-gray-200'}`} onClick={() => setStep(1)}>1) اختيار عناصر الإرجاع</button>
				<button className={`px-3 py-1 rounded ${step===2?'bg-black text-white':'bg-gray-200'}`} onClick={() => setStep(2)}>2) اختيار عناصر الاستبدال</button>
				<button className={`px-3 py-1 rounded ${step===3?'bg-black text-white':'bg-gray-200'}`} onClick={() => setStep(3)}>3) التسوية</button>
			</div>
			{step === 1 && (
				<table className="w-full text-right">
					<thead>
						<tr className="text-sm text-gray-600">
							<th className="p-2">الصنف</th>
							<th className="p-2">المتاح</th>
							<th className="p-2">السعر</th>
							<th className="p-2">الكمية</th>
						</tr>
					</thead>
					<tbody>
						{sale.lines.map((l) => {
							const q = ret[l.sku] || 0;
							const max = l.eligibleQty;
							return (
								<tr key={l.sku} className="border-t">
									<td className="p-2"><bdi dir="ltr">{l.sku}</bdi></td>
									<td className="p-2 text-sm">{max}</td>
									<td className="p-2 text-sm">{(l.unitPrice || 0).toLocaleString('ar-SA')}</td>
									<td className="p-2">
										<input type="number" min={0} max={max} value={q} onChange={(e) => setRet((p) => ({ ...p, [l.sku]: Math.max(0, Math.min(max, Number(e.target.value))) }))} className="w-20 border rounded px-2 py-1" />
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			)}
			{step === 2 && (
				<div className="space-y-3">
					<Search onAdd={(l) => addToCart(l)} />
					<div className="border rounded divide-y">
						{cart.map((c) => (
							<div key={c.sku} className="flex items-center gap-2 p-2">
								<div className="flex-1 text-right"><bdi dir="ltr">{c.sku}</bdi></div>
								<input type="number" min={1} value={c.qty} onChange={(e) => setCart((prev) => prev.map((x) => x.sku===c.sku?{...x, qty: Math.max(1, Number(e.target.value))}:x))} className="w-20 border rounded px-2 py-1" />
								<div>{(c.unitPrice * c.qty).toLocaleString('ar-SA')}</div>
								<button onClick={() => setCart((prev) => prev.filter((x) => x.sku !== c.sku))} className="px-2 py-1 text-red-600">حذف</button>
							</div>
						))}
					</div>
					<div className="text-right">الإجمالي: {newTotal.toLocaleString('ar-SA')}</div>
				</div>
			)}
			{step === 3 && (
				<div className="space-y-3">
					<div>إرجاع: {returnedTotal.toLocaleString('ar-SA')} — جديد: {newTotal.toLocaleString('ar-SA')}</div>
					{customerOwes > 0 ? (
						<div className="flex items-center gap-2">
							<div>المبلغ المستحق على العميل:</div>
							<div className="font-semibold">{customerOwes.toLocaleString('ar-SA')}</div>
							<select value={paidMethod} onChange={(e) => setPaidMethod(e.target.value as any)} className="border rounded px-2 py-1">
								<option value="">اختر طريقة الدفع</option>
								<option value="cash">نقدًا</option>
								<option value="card">بطاقة</option>
							</select>
						</div>
					) : shopOwes > 0 ? (
						<div className="flex items-center gap-2">
							<div>المبلغ المسترد للعميل:</div>
							<div className="font-semibold">{shopOwes.toLocaleString('ar-SA')}</div>
							<select value={refundMethod} onChange={(e) => setRefundMethod(e.target.value as any)} className="border rounded px-2 py-1">
								<option value="">اختر طريقة الاسترداد</option>
								<option value="cash">نقدًا</option>
								<option value="card">بطاقة</option>
								<option value="store_credit">رصيد متجر</option>
							</select>
						</div>
					) : (
						<div>لا يوجد فرق في المبلغ.</div>
					)}
					<button onClick={finalize} className="px-4 py-2 bg-green-600 text-white rounded">إنهاء الاستبدال</button>
				</div>
			)}
		</div>
	);
}


