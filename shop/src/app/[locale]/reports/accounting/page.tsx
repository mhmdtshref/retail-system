"use client";
import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Stack, Typography, TextField, Snackbar, Alert } from '@mui/material';
import { DataTable } from '@/components/mui/DataTable';
import type { GridColDef } from '@mui/x-data-grid';

export default function AccountingReportsPage() {
  const [role, setRole] = useState<string>('viewer');
  const [offline, setOffline] = useState<boolean>(false);
  const [batches, setBatches] = useState<any[]>([]);
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success'|'info'|'warning'|'error' }>({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/self', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setRole(data?.user?.role || 'viewer');
        }
      } catch {}
      setOffline(typeof navigator !== 'undefined' ? !navigator.onLine : false);
    })();
  }, []);

  const canExport = role === 'owner' || role === 'manager';
  const disabled = offline || !canExport || !from || !to || loading;

  async function runExport() {
    setLoading(true);
    try {
      const key = `acc-${from}-${to}`;
      const res = await fetch('/api/accounting/export', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify({ from, to }) });
      if (res.ok) {
        const data = await res.json();
        setBatches((prev) => [data, ...prev.filter((b) => b._id !== data._id)]);
        setSnack({ open: true, message: 'تم إطلاق التصدير', severity: 'success' });
      } else {
        setSnack({ open: true, message: 'تعذر تشغيل التصدير', severity: 'error' });
      }
    } catch {
      setSnack({ open: true, message: 'تعذر تشغيل التصدير', severity: 'error' });
    }
    setLoading(false);
  }

  const columns: GridColDef[] = [
    { field: '_id', headerName: 'المعرف', width: 220 },
    { field: 'period', headerName: 'الفترة', flex: 1, minWidth: 220, valueGetter: (p) => `${p.row.rangeLocal?.start || ''} → ${p.row.rangeLocal?.end || ''}` },
    { field: 'status', headerName: 'الحالة', width: 160 },
    { field: 'files', headerName: 'الملفات', flex: 1, minWidth: 220, valueGetter: (p) => Array.isArray(p.row.files) ? p.row.files.map((f: any) => f.name).join(', ') : '' },
  ];

  return (
    <Box component="main" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }} dir="rtl">
      <Typography variant="h6" fontWeight={600}>التقارير المحاسبية</Typography>
      {offline && <Alert severity="warning">العملية تتطلب اتصالاً بالإنترنت</Alert>}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
        <TextField size="small" type="date" value={from} onChange={(e)=> setFrom(e.target.value)} sx={{ width: { xs: '100%', sm: 220 } }} />
        <Typography>إلى</Typography>
        <TextField size="small" type="date" value={to} onChange={(e)=> setTo(e.target.value)} sx={{ width: { xs: '100%', sm: 220 } }} />
        <Button disabled={disabled} onClick={runExport} variant="outlined">تشغيل التصدير</Button>
      </Stack>

      <DataTable rows={batches} columns={columns} loading={loading} getRowId={(r) => (r as any)._id} autoHeight />

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
        <Alert severity={snack.severity} variant="filled" onClose={() => setSnack({ ...snack, open: false })}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

