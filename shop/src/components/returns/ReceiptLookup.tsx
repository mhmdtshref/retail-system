"use client";
import { useState } from 'react';
import { Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';

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
    <Box>
      <Stack direction="row" spacing={1}>
        <TextField size="small" inputProps={{ dir: 'rtl' }} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="أدخل رقم الإيصال" sx={{ flex: 1 }} />
        <Button onClick={search} disabled={loading} variant="contained">بحث</Button>
      </Stack>
      {results.length > 0 && (
        <Paper variant="outlined" sx={{ mt: 1 }}>
          {results.map((s) => (
            <Button key={s.saleId} onClick={() => onPick(s)} sx={{ justifyContent: 'flex-start', width: '100%', textAlign: 'right', borderBottom: (t)=> `1px solid ${t.palette.divider}`, borderRadius: 0, py: 1.25 }}>
              <Box sx={{ width: '100%' }}>
                <Typography variant="body2">الإيصال: <bdi dir="ltr">{s.receiptNo}</bdi> — {new Date(s.date || 0).toLocaleString('ar-SA')}</Typography>
                <Typography variant="caption" color="text.secondary">عناصر: {s.lines.length}</Typography>
              </Box>
            </Button>
          ))}
        </Paper>
      )}
    </Box>
  );
}


