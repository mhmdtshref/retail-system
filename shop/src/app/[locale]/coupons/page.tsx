"use client";
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Box, Button, Stack, Typography, Snackbar, Alert } from '@mui/material';
import { DataTable } from '@/components/mui/DataTable';
import type { GridColDef } from '@mui/x-data-grid';

export default function CouponsPage() {
  const t = useTranslations();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success'|'info'|'warning'|'error' }>({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/coupons', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setRows(data.coupons || []);
        } else {
          setSnack({ open: true, message: 'تعذر تحميل القسائم', severity: 'error' });
        }
      } catch {
        setSnack({ open: true, message: 'تعذر تحميل القسائم', severity: 'error' });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const columns: GridColDef[] = [
    { field: 'code', headerName: 'الكود', width: 200, renderCell: (p) => <bdi dir="ltr">{String(p.value || '')}</bdi> },
    { field: 'value', headerName: 'القيمة', width: 140 },
    { field: 'type', headerName: 'النوع', width: 160 },
    { field: 'active', headerName: 'الحالة', width: 140, valueFormatter: (p) => (p.value ? 'نشط' : 'متوقف') },
  ];

  return (
    <Box component="main" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }} dir="rtl">
      <Stack direction="row" alignItems="center">
        <Typography variant="h6" fontWeight={600}>القسائم</Typography>
        <Button onClick={() => { window.location.href='/coupons/new-batch'; }} variant="contained" color="success" sx={{ ml: 'auto' }}>توليد مجموعة</Button>
      </Stack>

      <DataTable rows={rows} columns={columns} loading={loading} getRowId={(r) => (r as any)._id} autoHeight />

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
        <Alert severity={snack.severity} variant="filled" onClose={() => setSnack({ ...snack, open: false })}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
