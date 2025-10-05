"use client";
export function ExchangeReceipt({ exchangeId, returnLines, newLines, settlement, pending }: { exchangeId: string; returnLines: Array<{ sku: string; qty: number; unitPrice: number }>; newLines: Array<{ sku: string; qty: number; unitPrice: number }>; settlement: { customerOwes: number; shopOwes: number; paidMethod?: string; refundMethod?: string }; pending?: boolean }) {
	const returnedTotal = returnLines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
	const newTotal = newLines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
	return (
		<div className="receipt w-[300px] text-right" dir="rtl">
			<div className="text-center font-bold text-lg">إيصال الاستبدال</div>
			{pending && <div className="text-center text-red-600">معلّق للمزامنة</div>}
			<div>معرف: <bdi dir="ltr">{exchangeId.slice(-6)}</bdi></div>
			<hr />
			<div className="font-semibold">عناصر مرتجعة</div>
			<table className="w-full text-sm">
				<tbody>
					{returnLines.map((l, idx) => (
						<tr key={idx}>
							<td><bdi dir="ltr">{l.sku}</bdi></td>
							<td>x{l.qty}</td>
							<td>{(l.qty * l.unitPrice).toLocaleString('ar-SA')}</td>
						</tr>
					))}
				</tbody>
			</table>
			<div className="font-semibold mt-2">عناصر جديدة</div>
			<table className="w-full text-sm">
				<tbody>
					{newLines.map((l, idx) => (
						<tr key={idx}>
							<td><bdi dir="ltr">{l.sku}</bdi></td>
							<td>x{l.qty}</td>
							<td>{(l.qty * l.unitPrice).toLocaleString('ar-SA')}</td>
						</tr>
					))}
				</tbody>
			</table>
			<hr />
			<div>مرتجع: {returnedTotal.toLocaleString('ar-SA')} — جديد: {newTotal.toLocaleString('ar-SA')}</div>
			{settlement.customerOwes > 0 ? (
				<div>مستحق من العميل: {settlement.customerOwes.toLocaleString('ar-SA')} — {settlement.paidMethod}</div>
			) : settlement.shopOwes > 0 ? (
				<div>مسترد للعميل: {settlement.shopOwes.toLocaleString('ar-SA')} — {settlement.refundMethod}</div>
			) : (
				<div>لا فرق.</div>
			)}
		</div>
	);
}


