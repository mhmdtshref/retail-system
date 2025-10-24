"use client";
import { Box, Divider, Table, TableBody, TableRow, TableCell, Typography } from '@mui/material';
export function ReturnReceipt({ rma, saleId, lines, refund, pending }: { rma: string; saleId: string; lines: Array<{ sku: string; qty: number; unitPrice: number }>; refund?: { method: string; amount: number }; pending?: boolean }) {
	const total = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
	return (
		<Box dir="rtl" sx={{ width: 300, textAlign: 'right' }}>
			<Typography align="center" fontWeight={700}>إيصال الإرجاع</Typography>
			{pending && <Typography align="center" color="error">معلّق للمزامنة</Typography>}
			<Typography>RMA: <bdi dir="ltr">{rma}</bdi></Typography>
			<Typography>الإيصال الأصلي: <bdi dir="ltr">{saleId.slice(-6)}</bdi></Typography>
			<Divider sx={{ my: 1 }} />
			<Table size="small" aria-label="return-lines">
				<TableBody>
					{lines.map((l, idx) => (
						<TableRow key={idx}>
							<TableCell align="right"><bdi dir="ltr">{l.sku}</bdi></TableCell>
							<TableCell align="right">x{l.qty}</TableCell>
							<TableCell align="right">{(l.qty * l.unitPrice).toLocaleString('ar-SA')}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
			<Divider sx={{ my: 1 }} />
		  <Typography>الإجمالي المسترد: {total.toLocaleString('ar-SA')}</Typography>
		  {refund && (
		    <Typography>طريقة الاسترداد: {refund.method === 'store_credit' ? 'رصيد المتجر' : refund.method}</Typography>
		  )}
		</Box>
	);
}


