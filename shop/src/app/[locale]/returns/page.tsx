"use client";
import { useState } from 'react';
import { ReceiptLookup } from '@/components/returns/ReceiptLookup';
import { ReturnBuilder } from '@/components/returns/ReturnBuilder';
import { ExchangeBuilder } from '@/components/returns/ExchangeBuilder';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';

export default function ReturnsPage() {
const [tab, setTab] = useState<'return'|'exchange'>('return');
const [sale, setSale] = useState<any | null>(null);
	return (
		<Box dir="rtl" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
			<Typography variant="h6" fontWeight={600}>الإرجاع والاستبدال</Typography>
			<Stack direction="row" spacing={1}>
				<Button variant={tab==='return'?'contained':'outlined'} onClick={() => setTab('return')}>إرجاع</Button>
				<Button variant={tab==='exchange'?'contained':'outlined'} onClick={() => setTab('exchange')}>استبدال</Button>
			</Stack>
			<Paper variant="outlined" sx={{ p: 2 }}>
				<ReceiptLookup onPick={(sale: any) => setSale(sale)} />
			</Paper>
			{sale && (
				<Paper variant="outlined" sx={{ p: 2 }}>
					{tab === 'return' ? <ReturnBuilder sale={sale} /> : <ExchangeBuilder sale={sale} />}
				</Paper>
			)}
			<Typography variant="caption" color="text.secondary">ستتم طباعة إيصال {tab==='return'?'الإرجاع':'الاستبدال'} بعد التأكيد.</Typography>
		</Box>
	);
}


