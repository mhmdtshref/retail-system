"use client";
import { useMemo, useState } from 'react';
import { Search } from '@/components/pos/Search';
import { enqueueExchangeCreate } from '@/lib/outbox';
import { uuid } from '@/lib/pos/idempotency';
import { Box, Button, Stack, Typography, TextField, Select, MenuItem, Paper, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';

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
    // Show success via upstream Snackbar on parent if any; otherwise it's fine to be silent
	}

	return (
		<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
			<Stack direction="row" spacing={1}>
				<Button variant={step===1? 'contained':'outlined'} onClick={() => setStep(1)}>1) اختيار عناصر الإرجاع</Button>
				<Button variant={step===2? 'contained':'outlined'} onClick={() => setStep(2)}>2) اختيار عناصر الاستبدال</Button>
				<Button variant={step===3? 'contained':'outlined'} onClick={() => setStep(3)}>3) التسوية</Button>
			</Stack>
			{step === 1 && (
				<Table size="small">
					<TableHead>
						<TableRow>
							<TableCell align="right">الصنف</TableCell>
							<TableCell align="right">المتاح</TableCell>
							<TableCell align="right">السعر</TableCell>
							<TableCell align="right">الكمية</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{sale.lines.map((l) => {
							const q = ret[l.sku] || 0;
							const max = l.eligibleQty;
							return (
								<TableRow key={l.sku} hover>
									<TableCell align="right"><bdi dir="ltr">{l.sku}</bdi></TableCell>
									<TableCell align="right">{max}</TableCell>
									<TableCell align="right">{(l.unitPrice || 0).toLocaleString('ar-SA')}</TableCell>
									<TableCell align="right">
										<TextField size="small" type="number" inputProps={{ min: 0, max }} value={q} onChange={(e) => setRet((p) => ({ ...p, [l.sku]: Math.max(0, Math.min(max, Number(e.target.value))) }))} sx={{ width: 90 }} />
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			)}
			{step === 2 && (
				<Stack spacing={1}>
					<Search onAdd={(l) => addToCart(l)} />
					<Paper variant="outlined">
						{cart.map((c) => (
							<Stack key={c.sku} direction="row" alignItems="center" spacing={1} sx={{ p: 1, borderTop: '1px solid', borderColor: 'divider' }}>
								<Typography sx={{ flex: 1, textAlign: 'right' }}><bdi dir="ltr">{c.sku}</bdi></Typography>
								<TextField size="small" type="number" inputProps={{ min: 1 }} value={c.qty} onChange={(e) => setCart((prev) => prev.map((x) => x.sku===c.sku?{...x, qty: Math.max(1, Number(e.target.value))}:x))} sx={{ width: 90 }} />
								<Typography>{(c.unitPrice * c.qty).toLocaleString('ar-SA')}</Typography>
								<Button color="error" onClick={() => setCart((prev) => prev.filter((x) => x.sku !== c.sku))}>حذف</Button>
							</Stack>
						))}
					</Paper>
					<Typography textAlign="right">الإجمالي: {newTotal.toLocaleString('ar-SA')}</Typography>
				</Stack>
			)}
			{step === 3 && (
				<Stack spacing={1}>
					<Typography>إرجاع: {returnedTotal.toLocaleString('ar-SA')} — جديد: {newTotal.toLocaleString('ar-SA')}</Typography>
					{customerOwes > 0 ? (
						<Stack direction="row" spacing={1} alignItems="center">
							<Typography>المبلغ المستحق على العميل:</Typography>
							<Typography fontWeight={600}>{customerOwes.toLocaleString('ar-SA')}</Typography>
							<Select size="small" value={paidMethod} onChange={(e) => setPaidMethod(e.target.value as any)} displayEmpty sx={{ minWidth: 180 }}>
								<MenuItem value="">اختر طريقة الدفع</MenuItem>
								<MenuItem value="cash">نقدًا</MenuItem>
								<MenuItem value="card">بطاقة</MenuItem>
							</Select>
						</Stack>
					) : shopOwes > 0 ? (
						<Stack direction="row" spacing={1} alignItems="center">
							<Typography>المبلغ المسترد للعميل:</Typography>
							<Typography fontWeight={600}>{shopOwes.toLocaleString('ar-SA')}</Typography>
							<Select size="small" value={refundMethod} onChange={(e) => setRefundMethod(e.target.value as any)} displayEmpty sx={{ minWidth: 180 }}>
								<MenuItem value="">اختر طريقة الاسترداد</MenuItem>
								<MenuItem value="cash">نقدًا</MenuItem>
								<MenuItem value="card">بطاقة</MenuItem>
								<MenuItem value="store_credit">رصيد متجر</MenuItem>
							</Select>
						</Stack>
					) : (
						<Typography>لا يوجد فرق في المبلغ.</Typography>
					)}
					<Button onClick={finalize} variant="contained" color="success">إنهاء الاستبدال</Button>
				</Stack>
			)}
		</Box>
	);
}


