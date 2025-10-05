"use client";
import { useState } from 'react';
import { ReceiptLookup } from '@/components/returns/ReceiptLookup';
import { ReturnBuilder } from '@/components/returns/ReturnBuilder';
import { ExchangeBuilder } from '@/components/returns/ExchangeBuilder';

export default function ReturnsPage() {
const [tab, setTab] = useState<'return'|'exchange'>('return');
const [sale, setSale] = useState<any | null>(null);
	return (
		<div dir="rtl" className="p-4 space-y-4">
			<h1 className="text-xl font-bold">الإرجاع والاستبدال</h1>
			<div className="flex gap-2">
				<button className={`px-3 py-2 rounded ${tab==='return'?'bg-black text-white':'bg-gray-200'}`} onClick={() => setTab('return')}>إرجاع</button>
				<button className={`px-3 py-2 rounded ${tab==='exchange'?'bg-black text-white':'bg-gray-200'}`} onClick={() => setTab('exchange')}>استبدال</button>
			</div>
			<div className="bg-white rounded border p-3">
				<ReceiptLookup onPick={(sale: any) => setSale(sale)} />
			</div>
			{sale && (
				<div className="bg-white rounded border p-3">
					{tab === 'return' ? <ReturnBuilder sale={sale} /> : <ExchangeBuilder sale={sale} />}
				</div>
			)}
			<div className="text-xs text-gray-500">ستتم طباعة إيصال {tab==='return'?'الإرجاع':'الاستبدال'} بعد التأكيد.</div>
		</div>
	);
}


