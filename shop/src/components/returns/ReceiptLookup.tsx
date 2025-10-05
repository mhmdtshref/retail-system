"use client";
import { useState } from 'react';

type SaleLine = { sku: string; soldQty: number; returnedQty: number; eligibleQty: number; unitPrice?: number };
type SaleSummary = { saleId: string; receiptNo: string; customerId?: string; date?: number; lines: SaleLine[] };

export function ReceiptLookup({ onPick }: { onPick: (sale: SaleSummary) => void }) {
	const [query, setQuery] = useState('');
	const [results, setResults] = useState<SaleSummary[]>([]);
	const [loading, setLoading] = useState(false);

	async function search() {
		setLoading(true);
		try {
			const qs = new URLSearchParams();
			if (query) qs.set('receipt', query);
			const res = await fetch(`/api/sales/lookup?${qs.toString()}`);
			if (res.ok) {
				const data = await res.json();
				setResults(data.results || []);
			}
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="space-y-2">
			<div className="flex gap-2">
				<input dir="rtl" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="أدخل رقم الإيصال" className="border rounded px-3 py-2 flex-1" />
				<button onClick={search} disabled={loading} className="px-3 py-2 bg-blue-600 text-white rounded">بحث</button>
			</div>
			{results.length > 0 && (
				<div className="border rounded divide-y bg-white">
					{results.map((s) => (
						<button key={s.saleId} onClick={() => onPick(s)} className="w-full text-right p-2 hover:bg-gray-50">
							<div className="text-sm">الإيصال: <bdi dir="ltr">{s.receiptNo}</bdi> — {new Date(s.date || 0).toLocaleString('ar-SA')}</div>
							<div className="text-xs text-gray-500">عناصر: {s.lines.length}</div>
						</button>
					))}
				</div>
			)}
		</div>
	);
}


