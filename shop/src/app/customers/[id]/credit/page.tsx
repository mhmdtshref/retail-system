"use client";
import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Stack, Typography, TextField, Snackbar, Alert, Paper } from '@mui/material';
import { DataTable } from '@/components/mui/DataTable';
import type { GridColDef } from '@mui/x-data-grid';

type Credit = { _id: string; code: string; issuedAmount: number; remainingAmount: number; status: string; issuedAt: number; expiresAt?: number };

export default function CustomerCreditPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [balance, setBalance] = useState<number>(0);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);
  const [issueAmount, setIssueAmount] = useState<number | ''>('');
  const [issueExpiry, setIssueExpiry] = useState<string>('');
  const [issueNote, setIssueNote] = useState<string>('');
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success'|'info'|'warning'|'error' }>({ open: false, message: '', severity: 'info' });

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/customers/${id}/credit`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      setBalance(data.balance || 0);
      setCredits(data.credits || []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function issue() {
    const body: any = { customerId: id, amount: issueAmount ? Number(issueAmount) : 0, origin: { type: 'manual' as const } };
    if (issueExpiry) body.expiresAt = new Date(issueExpiry).toISOString();
    if (issueNote) body.note = issueNote;
    const res = await fetch('/api/store-credit/issue', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `issue:${id}:${Date.now()}` }, body: JSON.stringify(body) });
    if (res.ok) { await load(); setIssueAmount(''); setIssueExpiry(''); setIssueNote(''); setSnack({ open: true, message: 'تم الإصدار', severity: 'success' }); }
    else { setSnack({ open: true, message: 'فشل الإصدار', severity: 'error' }); }
  }

  const columns: GridColDef[] = [
    { field: 'code', headerName: 'الكود', width: 200, renderCell: (p) => <bdi dir="ltr">{String(p.value || '')}</bdi> },
    { field: 'issuedAmount', headerName: 'المبلغ الصادر', width: 180, valueFormatter: (p) => Number(p.value || 0).toLocaleString('ar-SA') },
    { field: 'remainingAmount', headerName: 'المتبقي', width: 160, valueFormatter: (p) => Number(p.value || 0).toLocaleString('ar-SA') },
    { field: 'status', headerName: 'الحالة', width: 140 },
    { field: 'expiresAt', headerName: 'الانتهاء', width: 160, valueFormatter: (p) => p.value ? new Date(p.value as number).toLocaleDateString('ar-SA') : '—' },
  ];

  return (
    <Box component="main" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }} dir="rtl">
      <Typography variant="h6" fontWeight={600}>رصيد العميل</Typography>
      {loading ? (
        <Typography variant="body2">جار التحميل…</Typography>
      ) : (
        <>
          <Paper variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'success.light', color: 'success.contrastText' }}>
            <Typography>الرصيد المتاح</Typography>
            <Typography variant="h6" fontWeight={700}>{balance.toLocaleString('ar-SA')}</Typography>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography fontWeight={600} sx={{ mb: 1 }}>إصدار رصيد</Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
              <TextField size="small" type="number" value={issueAmount} onChange={(e)=> setIssueAmount(e.target.value === '' ? '' : Number(e.target.value))} placeholder="المبلغ" sx={{ width: { xs: '100%', md: 200 } }} />
              <TextField size="small" type="date" value={issueExpiry} onChange={(e)=> setIssueExpiry(e.target.value)} sx={{ width: { xs: '100%', md: 200 } }} />
              <TextField size="small" value={issueNote} onChange={(e)=> setIssueNote(e.target.value)} placeholder="ملاحظة" sx={{ flex: 1 }} />
              <Button variant="contained" disabled={!issueAmount || Number(issueAmount) <= 0} onClick={issue}>إصدار</Button>
            </Stack>
          </Paper>

          <DataTable rows={credits} columns={columns} getRowId={(r) => (r as any)._id} autoHeight />
        </>
      )}

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
        <Alert severity={snack.severity} variant="filled" onClose={() => setSnack({ ...snack, open: false })}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}


