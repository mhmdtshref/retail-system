"use client";
import { Box, Divider, Table, TableBody, TableRow, TableCell, Typography } from '@mui/material';
export function ExchangeReceipt({ exchangeId, returnLines, newLines, settlement, pending }: { exchangeId: string; returnLines: Array<{ sku: string; qty: number; unitPrice: number }>; newLines: Array<{ sku: string; qty: number; unitPrice: number }>; settlement: { customerOwes: number; shopOwes: number; paidMethod?: string; refundMethod?: string }; pending?: boolean }) {
	const returnedTotal = returnLines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
	const newTotal = newLines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
	return (
		<Box dir="rtl" sx={{ width: 300, textAlign: 'right' }}>
			<Typography align="center" fontWeight={700}>إيصال الاستبدال</Typography>
			{pending && <Typography align="center" color="error">معلّق للمزامنة</Typography>}
			<Typography>معرف: <bdi dir="ltr">{exchangeId.slice(-6)}</bdi></Typography>
			<Divider sx={{ my: 1 }} />
			<Typography fontWeight={600}>عناصر مرتجعة</Typography>
			<Table size="small" aria-label="returned-lines">
				<TableBody>
					{returnLines.map((l, idx) => (
						<TableRow key={idx}>
							<TableCell align="right"><bdi dir="ltr">{l.sku}</bdi></TableCell>
							<TableCell align="right">x{l.qty}</TableCell>
							<TableCell align="right">{(l.qty * l.unitPrice).toLocaleString('ar-SA')}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
			<Typography fontWeight={600} sx={{ mt: 1 }}>عناصر جديدة</Typography>
			<Table size="small" aria-label="new-lines">
				<TableBody>
					{newLines.map((l, idx) => (
						<TableRow key={idx}>
							<TableCell align="right"><bdi dir="ltr">{l.sku}</bdi></TableCell>
							<TableCell align="right">x{l.qty}</TableCell>
							<TableCell align="right">{(l.qty * l.unitPrice).toLocaleString('ar-SA')}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
			<Divider sx={{ my: 1 }} />
			<Typography>مرتجع: {returnedTotal.toLocaleString('ar-SA')} — جديد: {newTotal.toLocaleString('ar-SA')}</Typography>
			{settlement.customerOwes > 0 ? (
				<Typography>مستحق من العميل: {settlement.customerOwes.toLocaleString('ar-SA')} — {settlement.paidMethod}</Typography>
			) : settlement.shopOwes > 0 ? (
				<Typography>مسترد للعميل: {settlement.shopOwes.toLocaleString('ar-SA')} — {settlement.refundMethod}</Typography>
			) : (
				<Typography>لا فرق.</Typography>
			)}
		</Box>
	);
}


