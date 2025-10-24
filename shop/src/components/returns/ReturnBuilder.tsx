"use client";
import { useMemo, useState } from 'react';
import { enqueueReturnCreate } from '@/lib/outbox';
import { uuid } from '@/lib/pos/idempotency';
import { Box, Button, Stack, Typography, TextField, Select, MenuItem, Paper, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';

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
    // Show success via upstream Snackbar if present
	}

	return (
		<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
			<Table size="small">
				<TableHead>
					<TableRow>
						<TableCell align="right">الصنف</TableCell>
						<TableCell align="right">المتاح</TableCell>
						<TableCell align="right">السعر</TableCell>
						<TableCell align="right">الكمية</TableCell>
						<TableCell align="right">السبب</TableCell>
						<TableCell align="right">الحالة</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					{sale.lines.map((l) => {
						const q = qtyBySku[l.sku] || 0;
						const max = l.eligibleQty;
						return (
							<TableRow key={l.sku} hover>
								<TableCell align="right"><bdi dir="ltr">{l.sku}</bdi></TableCell>
								<TableCell align="right">{max}</TableCell>
								<TableCell align="right">{(l.unitPrice || 0).toLocaleString('ar-SA')}</TableCell>
								<TableCell align="right">
									<TextField size="small" type="number" inputProps={{ min: 0, max }} value={q} onChange={(e) => setQty(l.sku, Number(e.target.value), max)} sx={{ width: 90 }} />
								</TableCell>
								<TableCell align="right">
									<Select size="small" value={reasonBySku[l.sku] || ''} onChange={(e) => setReasonBySku((p) => ({ ...p, [l.sku]: e.target.value }))} displayEmpty sx={{ minWidth: 160 }}>
										<MenuItem value="" disabled>اختر</MenuItem>
										{reasons.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
									</Select>
								</TableCell>
								<TableCell align="right">
									<Select size="small" value={conditionBySku[l.sku] || ''} onChange={(e) => setConditionBySku((p) => ({ ...p, [l.sku]: e.target.value }))} displayEmpty sx={{ minWidth: 160 }}>
										<MenuItem value="" disabled>اختر</MenuItem>
										{conditions.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
									</Select>
								</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
			<Stack direction="row" spacing={1} alignItems="center">
				<Typography>طريقة الاسترداد:</Typography>
				<Select size="small" value={method} onChange={(e) => setMethod(e.target.value as any)} sx={{ minWidth: 160 }}>
					<MenuItem value="cash">نقدًا</MenuItem>
					<MenuItem value="card">بطاقة</MenuItem>
					<MenuItem value="store_credit">رصيد متجر</MenuItem>
				</Select>
				<Typography sx={{ ml: 'auto' }}>الإجمالي: {total.toLocaleString('ar-SA')}</Typography>
			</Stack>
			<TextField multiline minRows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ملاحظات" />
			<Button onClick={confirm} variant="contained" color="success">تأكيد الإرجاع</Button>
		</Box>
	);
}


