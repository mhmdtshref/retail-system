"use client";
import { useEffect, useState } from 'react';
import { Box, Stack, Button, TextField, MenuItem, Snackbar, Alert } from '@mui/material';
import { DataTable } from '@/components/mui/DataTable';
import type { GridColDef } from '@mui/x-data-grid';

export default function ReplayTable() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [kind, setKind] = useState<'webhook'|'delivery'|'notification'|'outbox'>('webhook');
  const [ids, setIds] = useState<string>('');
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success'|'info'|'warning'|'error' }>({ open: false, message: '', severity: 'info' });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/tools/replays/jobs', { cache: 'no-store' });
      const data = await res.json();
      setJobs(data.items || []);
    } catch {
      setSnack({ open: true, message: 'تعذر تحميل البيانات', severity: 'error' });
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function run() {
    const list = ids.split(/[\,\s]+/).map((s)=> s.trim()).filter(Boolean).slice(0, 100);
    if (!list.length) return;
    const res = await fetch('/api/admin/tools/replays/run', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `${kind}:${Date.now()}` }, body: JSON.stringify({ kind, ids: list, options: { backoffMs: 1000, maxAttempts: 5 } }) });
    if (res.ok) {
      setIds('');
      setSnack({ open: true, message: 'تم إرسال المهمة', severity: 'success' });
      await load();
    } else {
      setSnack({ open: true, message: 'فشل التنفيذ', severity: 'error' });
    }
  }

  const columns: GridColDef[] = [
    { field: 'kind', headerName: 'النوع', width: 140 },
    { field: 'jobId', headerName: 'المعرف', flex: 1, minWidth: 220, renderCell: (p) => <Typography component="span" dir="ltr">{String(p.value || '')}</Typography> },
    { field: 'status', headerName: 'الحالة', width: 140 },
    { field: 'stats', headerName: 'النتائج', flex: 1, minWidth: 200, valueGetter: (p) => (p.row as any).stats ? JSON.stringify((p.row as any).stats) : '-' },
    { field: 'createdAt', headerName: 'الوقت', width: 200, valueFormatter: (p) => p.value ? new Date(p.value as string).toLocaleString('ar-SA') : '-' },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }} dir="rtl">
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
        <TextField size="small" select value={kind} onChange={(e)=> setKind(e.target.value as any)} sx={{ width: { xs: '100%', sm: 220 } }}>
          <MenuItem value="webhook">Webhooks</MenuItem>
          <MenuItem value="delivery">التوصيل</MenuItem>
          <MenuItem value="notification">الإشعارات</MenuItem>
          <MenuItem value="outbox">Outbox</MenuItem>
        </TextField>
        <TextField size="small" placeholder="IDs مفصولة بفواصل" value={ids} onChange={(e)=> setIds(e.target.value)} sx={{ flex: 1 }} inputProps={{ dir: 'ltr' }} />
        <Button onClick={run} variant="contained">تشغيل</Button>
      </Stack>

      <DataTable rows={jobs} columns={columns} loading={loading} getRowId={(r) => (r as any)._id || (r as any).jobId} autoHeight />

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
        <Alert severity={snack.severity} variant="filled" onClose={() => setSnack({ ...snack, open: false })}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
