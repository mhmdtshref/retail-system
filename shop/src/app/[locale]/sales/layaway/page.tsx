"use client";
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Box, Button, Grid, Paper, Stack, Typography } from '@mui/material';
import { DataTable } from '@/components/mui/DataTable';
import { GridColDef } from '@mui/x-data-grid';

type Row = { id: string; customerId?: string; createdAt: number; remaining: number; nextDueDate?: string; overdueDays: number; status: string };

export default function LayawayPage() {
  const t = useTranslations();
  const [rows, setRows] = useState<Row[]>([]);
  const [rollup, setRollup] = useState<{ ['0-7']: number; ['8-14']: number; ['15-30']: number; ['>30']: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/sales/layaway');
        if (!res.ok) throw new Error('failed');
        const data = await res.json();
        if (!cancelled) {
          setRows(data.rows);
          setRollup(data.rollup);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const columns: GridColDef[] = useMemo(() => ([
    { field: 'customerId', headerName: t('layaway.customer') || 'العميل', flex: 1 },
    { field: 'remaining', headerName: t('layaway.remaining') || 'المتبقي', width: 140, valueFormatter: (p) => (p.value as number)?.toFixed?.(2) },
    { field: 'nextDueDate', headerName: t('layaway.nextDue') || 'الاستحقاق التالي', width: 160, renderCell: (p) => (
      <Typography component="span" dir="ltr">{p.value ? new Date(p.value as string).toLocaleDateString() : '-'}</Typography>
    ) },
    { field: 'overdueDays', headerName: t('layaway.overdueDays') || 'العمر', width: 120 },
    { field: 'status', headerName: t('layaway.status') || 'الحالة', width: 140 },
    { field: 'actions', headerName: '', width: 220, sortable: false, renderCell: (p) => (
      <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ width: '100%' }}>
        <Button variant="outlined" size="small">{t('layaway.collect') || 'تحصيل دفعة'}</Button>
        <Button variant="outlined" size="small">{t('layaway.cancel') || 'إلغاء الحجز'}</Button>
      </Stack>
    ) },
  ]), [t]);

  return (
    <Box component="main" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }} dir="rtl">
      <Typography variant="h6" fontWeight={600}>{t('layaway.title') || 'تقسيط/الحجوزات'}</Typography>
      {rollup && (
        <Grid container spacing={1}>
          <Grid item xs={6} md={3}>
            <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">0–7</Typography>
              <Typography fontWeight={600}>{rollup['0-7'].toFixed(2)}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} md={3}>
            <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">8–14</Typography>
              <Typography fontWeight={600}>{rollup['8-14'].toFixed(2)}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} md={3}>
            <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">15–30</Typography>
              <Typography fontWeight={600}>{rollup['15-30'].toFixed(2)}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} md={3}>
            <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">{t('layaway.over30') || 'أكثر من 30'}</Typography>
              <Typography fontWeight={600}>{rollup['>30'].toFixed(2)}</Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      <DataTable rows={rows} columns={columns} loading={loading} getRowId={(r) => (r as Row).id} autoHeight />
    </Box>
  );
}

