"use client";
export function ReturnReceipt({ rma, saleId, lines, refund, pending }: { rma: string; saleId: string; lines: Array<{ sku: string; qty: number; unitPrice: number }>; refund?: { method: string; amount: number }; pending?: boolean }) {
	const total = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
	return (
		<div className="receipt w-[300px] text-right" dir="rtl">
			<div className="text-center font-bold text-lg">إيصال الإرجاع</div>
			{pending && <div className="text-center text-red-600">معلّق للمزامنة</div>}
			<div>RMA: <bdi dir="ltr">{rma}</bdi></div>
			<div>الإيصال الأصلي: <bdi dir="ltr">{saleId.slice(-6)}</bdi></div>
			<hr />
			<table className="w-full text-sm">
				<tbody>
					{lines.map((l, idx) => (
						<tr key={idx}>
							<td><bdi dir="ltr">{l.sku}</bdi></td>
							<td>x{l.qty}</td>
							<td>{(l.qty * l.unitPrice).toLocaleString('ar-SA')}</td>
						</tr>
					))}
				</tbody>
			</table>
			<hr />
      <div>الإجمالي المسترد: {total.toLocaleString('ar-SA')}</div>
      {refund && (
        <div>
          طريقة الاسترداد: {refund.method === 'store_credit' ? 'رصيد المتجر' : refund.method}
        </div>
      )}
		</div>
	);
}


