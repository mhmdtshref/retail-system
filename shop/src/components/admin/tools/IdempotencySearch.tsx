"use client";
import { useState } from 'react';
import { Box, Stack, Button, TextField, Snackbar, Alert } from '@mui/material';
import { DataTable } from '@/components/mui/DataTable';
import type { GridColDef } from '@mui/x-data-grid';

export default function IdempotencySearch() {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success'|'info'|'warning'|'error' }>({ open: false, message: '', severity: 'info' });

  async function search() {
    setLoading(true);
    try {
      const url = new URL('/api/admin/tools/idempotency', window.location.origin);
      if (q) url.searchParams.set('q', q);
      const res = await fetch(url.toString(), { cache: 'no-store' });
      const data = await res.json();
      setItems(data.items || []);
    } catch (e) {
      setSnack({ open: true, message: 'تعذر جلب النتائج', severity: 'error' });
    } finally { setLoading(false); }
  }

  async function rerun(key: string) {
    try {
      await fetch('/api/admin/tools/idempotency/replay', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `${key}:rerun:${Date.now()}` }, body: JSON.stringify({ key, newKey: `${key}:rerun:${Date.now()}`, dryRun: true }) });
      setSnack({ open: true, message: 'تم إرسال إعادة التشغيل', severity: 'success' });
    } catch {
      setSnack({ open: true, message: 'فشل إرسال إعادة التشغيل', severity: 'error' });
    }
  }

  async function invalidate(key: string) {
    try {
      const res = await fetch(`/api/admin/tools/idempotency/${encodeURIComponent(key)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('failed');
      setSnack({ open: true, message: 'تم الإلغاء', severity: 'success' });
      await search();
    } catch {
      setSnack({ open: true, message: 'فشل الإلغاء', severity: 'error' });
    }
  }

  const columns: GridColDef[] = [
    { field: '_id', headerName: 'المفتاح', width: 260, renderCell: (p) => <Typography component="span" dir="ltr">{String(p.value || '')}</Typography> },
    { field: 'route', headerName: 'المسار', flex: 1, minWidth: 180, renderCell: (p) => <Typography component="span" dir="ltr">{String(p.value || '')}</Typography> },
    { field: 'method', headerName: 'الطريقة', width: 120 },
    { field: 'entity', headerName: 'الكيان', flex: 0.8, minWidth: 160, valueGetter: (p) => {
      const e = (p.row as any).entity; return e ? `${e.type || ''} ${e.id || ''}` : '-';
    } },
    { field: 'createdAt', headerName: 'الوقت', width: 200, valueFormatter: (p) => p.value ? new Date(p.value as string).toLocaleString('ar-SA') : '-' },
    { field: 'actions', headerName: 'إجراءات', width: 220, sortable: false, filterable: false, renderCell: (p) => (
      <Stack direction="row" spacing={1}>
        <Button size="small" variant="outlined" onClick={() => rerun((p.row as any)._id)}>تجربة إعادة</Button>
        <Button size="small" variant="outlined" color="error" onClick={() => invalidate((p.row as any)._id)}>إلغاء</Button>
      </Stack>
    ) },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }} dir="rtl">
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
        <TextField size="small" placeholder="ابحث بالمفتاح/المسار" value={q} onChange={(e)=> setQ(e.target.value)} sx={{ flex: 1 }} inputProps={{ dir: 'ltr' }} />
        <Button onClick={search} variant="contained">بحث</Button>
      </Stack>

      <DataTable rows={items} columns={columns} loading={loading} getRowId={(r) => (r as any)._id} autoHeight />

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
        <Alert severity={snack.severity} variant="filled" onClose={() => setSnack({ ...snack, open: false })}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
