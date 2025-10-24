"use client";
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Box, Button, Stack, Typography, Snackbar, Alert } from '@mui/material';
import { DataTable } from '@/components/mui/DataTable';
import type { GridColDef } from '@mui/x-data-grid';

export default function PromotionsPage() {
  const t = useTranslations();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success'|'info'|'warning'|'error' }>({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/promotions', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setRows(data.promotions || []);
        } else {
          setSnack({ open: true, message: 'تعذر تحميل العروض', severity: 'error' });
        }
      } catch {
        setSnack({ open: true, message: 'تعذر تحميل العروض', severity: 'error' });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'الاسم', flex: 1, minWidth: 160 },
    { field: 'type', headerName: 'النوع', width: 140 },
    { field: 'level', headerName: 'المستوى', width: 140 },
    { field: 'priority', headerName: 'الأولوية', width: 120 },
    { field: 'active', headerName: 'الحالة', width: 120, valueFormatter: (p) => (p.value ? 'نشط' : 'متوقف') },
    { field: 'actions', headerName: 'إجراءات', width: 140, sortable: false, filterable: false, renderCell: (p) => (
      <Button size="small" variant="outlined" onClick={() => { window.location.href = `/promotions/${(p.row as any)._id}`; }}>عرض</Button>
    ) },
  ];

  return (
    <Box component="main" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }} dir="rtl">
      <Stack direction="row" alignItems="center">
        <Typography variant="h6" fontWeight={600}>العروض</Typography>
        <Button onClick={() => { window.location.href='/promotions/new'; }} variant="contained" color="success" sx={{ ml: 'auto' }}>جديد</Button>
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
