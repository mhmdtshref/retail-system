"use client";
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';

export default function TransferDetailPage({ params }: { params: { id: string } }) {
  const t = useTranslations();
  const [doc, setDoc] = useState<any | null>(null);
  const [picks, setPicks] = useState<Record<string, number>>({});
  const [receipts, setReceipts] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/transfers?status=&from=&to=');
      if (res.ok) {
        const data = await res.json();
        const found = (data.transfers || []).find((x: any) => x._id === params.id);
        setDoc(found || null);
      }
    })();
  }, [params.id]);

  if (!doc) return <Box component="main" sx={{ p: 2 }}>…</Box>;

  async function post(action: 'approve'|'pick'|'dispatch'|'receive') {
    const url = `/api/transfers/${doc._id}/${action}`;
    const payload = action === 'pick' ? { picks: Object.entries(picks).map(([k,v])=> ({ sku: k, qty: v })) }
                   : action === 'receive' ? { receipts: Object.entries(receipts).map(([k,v])=> ({ sku: k, qty: v })) }
                   : {};
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `${doc._id}:${action}:${Date.now()}` }, body: JSON.stringify(payload) });
    if (res.ok) {
      const data = await res.json();
      setDoc(data.transfer);
      setPicks({}); setReceipts({});
    }
  }

  return (
    <Box component="main" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h6" fontWeight={600}>{doc.code}</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={()=> post('approve')}>اعتماد</Button>
          <Button variant="outlined" onClick={()=> post('dispatch')}>شحن</Button>
          <Button variant="outlined" onClick={()=> post('receive')}>استلام</Button>
        </Stack>
      </Stack>
      <Paper variant="outlined">
        {(doc.lines||[]).map((l: any) => (
          <Stack key={l.sku + (l.variantId||'')} direction="row" sx={{ gap: 2, p: 1.5, borderTop: (t)=> `1px solid ${t.palette.divider}` }}>
            <Typography sx={{ width: 240, fontFamily: 'monospace' }}>{l.sku}</Typography>
            <Typography>الكمية: {l.qty}</Typography>
            <Typography>المُلتقط: {l.picked||0}</Typography>
            <Typography>المُستلم: {l.received||0}</Typography>
            <Stack direction="row" spacing={1}>
              <TextField size="small" type="number" sx={{ width: 100 }} placeholder="Pick" value={picks[l.sku]||''} onChange={(e)=> setPicks({ ...picks, [l.sku]: Number(e.target.value||0) })} />
              <TextField size="small" type="number" sx={{ width: 100 }} placeholder="Recv" value={receipts[l.sku]||''} onChange={(e)=> setReceipts({ ...receipts, [l.sku]: Number(e.target.value||0) })} />
              <Button variant="outlined" onClick={()=> post('pick')}>تأكيد الالتقاط</Button>
            </Stack>
          </Stack>
        ))}
      </Paper>
    </Box>
  );
}
