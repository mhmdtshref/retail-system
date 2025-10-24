"use client";
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Box, Typography, Snackbar, Alert } from '@mui/material';
import { DataTable } from '@/components/mui/DataTable';
import type { GridColDef } from '@mui/x-data-grid';

export default function DeliverySettingsPage() {
  const t = useTranslations();
  const [carriers, setCarriers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success'|'info'|'warning'|'error' }>({ open: false, message: '', severity: 'info' });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/delivery/carriers', { cache: 'no-store' });
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      setCarriers(data.carriers || []);
    } catch {
      setSnack({ open: true, message: 'تعذر تحميل شركات الشحن', severity: 'error' });
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'الاسم', flex: 1, minWidth: 160 },
    { field: 'type', headerName: 'النوع', width: 140 },
    { field: 'enabled', headerName: 'مفعل', width: 120, valueFormatter: (p) => (p.value ? 'نعم' : 'لا') },
    { field: 'city', headerName: 'المدينة', width: 160, valueGetter: (p) => p.row.pickup?.city || '' },
    { field: 'country', headerName: 'الدولة', width: 160, valueGetter: (p) => p.row.pickup?.country || '' },
  ];

  return (
    <Box component="main" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }} dir="rtl">
      <Typography variant="h6" fontWeight={600}>إعدادات التوصيل</Typography>

      <DataTable rows={carriers} columns={columns} loading={loading} getRowId={(r) => (r as any)._id} autoHeight />

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
        <Alert severity={snack.severity} variant="filled" onClose={() => setSnack({ ...snack, open: false })}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

