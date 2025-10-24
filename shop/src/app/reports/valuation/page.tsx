"use client";
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Box, Stack, Typography, TextField, Select, MenuItem, FormControlLabel, Checkbox, Snackbar, Alert } from '@mui/material';
import { DataTable } from '@/components/mui/DataTable';
import type { GridColDef, GridRowId } from '@mui/x-data-grid';

function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function ValuationReportPage() {
  const t = useTranslations('reports');
  const [asOf, setAsOf] = useState(todayIso());
  const [method, setMethod] = useState<'FIFO'|'WAVG'>('WAVG');
  const [includeReserved, setIncludeReserved] = useState(false);
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success'|'info'|'warning'|'error' }>({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/reports/valuation?asOf=${asOf}&method=${method}&includeReserved=${includeReserved}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('failed');
        const json = await res.json();
        setData(json.data);
      } catch {
        setSnack({ open: true, message: 'تعذر تحميل التقرير', severity: 'error' });
      } finally { setLoading(false); }
    })();
  }, [asOf, method, includeReserved]);

  const totals = useMemo(() => data?.totals || { units: 0, value: 0 }, [data]);
  const rows = useMemo(() => {
    const list = (data?.rows || []).map((r: any, idx: number) => ({ id: idx, ...r }));
    const totalRow = { id: 'total', sku: 'المجموع', name: '', units: totals.units, unitCost: null, value: totals.value } as any;
    return list.concat(totalRow);
  }, [data, totals.units, totals.value]);

  const columns: GridColDef[] = [
    { field: 'sku', headerName: t('valuation.sku'), width: 180 },
    { field: 'name', headerName: t('valuation.name'), flex: 1, minWidth: 200 },
    { field: 'units', headerName: t('valuation.units'), width: 140, valueFormatter: ({ value, id }) => id === 'total' ? String(Number(value || 0).toFixed(2)) : String(Number(value || 0).toFixed(2)) },
    { field: 'unitCost', headerName: t('valuation.unitCost'), width: 160, valueFormatter: ({ value, id }) => id === 'total' ? '—' : String(Number(value || 0).toFixed(2)) },
    { field: 'value', headerName: t('valuation.value'), width: 160, valueFormatter: ({ value }) => String(Number(value || 0).toFixed(2)) },
  ];

  return (
    <Box component="main" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }} dir="rtl">
      <Typography variant="h6" fontWeight={600}>{t('valuation')}</Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
        <TextField size="small" type="date" value={asOf} onChange={(e)=> setAsOf(e.target.value)} sx={{ width: { xs: '100%', sm: 220 } }} />
        <Select size="small" value={method} onChange={(e)=> setMethod(e.target.value as any)} sx={{ width: { xs: '100%', sm: 160 } }}>
          <MenuItem value="WAVG">WAVG</MenuItem>
          <MenuItem value="FIFO">FIFO</MenuItem>
        </Select>
        <FormControlLabel control={<Checkbox checked={includeReserved} onChange={(e)=> setIncludeReserved(e.target.checked)} />} label={t('filters.includeReserved')} />
      </Stack>

      <DataTable rows={rows} columns={columns} loading={loading} getRowId={(r) => (r as any).id as GridRowId} autoHeight />

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
        <Alert severity={snack.severity} variant="filled" onClose={() => setSnack({ ...snack, open: false })}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

