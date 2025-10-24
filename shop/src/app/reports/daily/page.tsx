"use client";
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Alert, Box, Grid, Paper, Stack, TextField, Typography } from '@mui/material';

function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function DailyReportPage() {
  const t = useTranslations('reports');
  const [from, setFrom] = useState(todayIso());
  const [to, setTo] = useState(todayIso());
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true); setError(null);
      try {
        const url = `/api/reports/daily?from=${from}&to=${to}`;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error('failed');
        const json = await res.json();
        setData(json.data);
      } catch (e: any) {
        setError(e?.message || 'error');
      } finally { setLoading(false); }
    })();
  }, [from, to]);

  const kpis = useMemo(() => {
    const c = data?.counters || {};
    return [
      { label: t('kpis.grossSales'), value: c.grossSales },
      { label: t('kpis.discounts'), value: c.discounts },
      { label: t('kpis.returns'), value: c.returns },
      { label: t('kpis.netSales'), value: c.netSales },
      { label: t('kpis.tax'), value: c.tax },
      { label: t('kpis.margin'), value: c.margin },
      { label: t('kpis.marginPct'), value: c.marginPct }
    ];
  }, [data, t]);

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6" fontWeight={600}>{t('daily')}</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
        <TextField size="small" type="date" value={from} onChange={(e)=> setFrom(e.target.value)} />
        <TextField size="small" type="date" value={to} onChange={(e)=> setTo(e.target.value)} />
      </Stack>
      {loading && <Typography variant="body2">...</Typography>}
      {error && <Typography color="error.main" variant="body2">{error}</Typography>}
      {data && (
        <Grid container spacing={1}>
          {kpis.map((k) => (
            <Grid key={k.label} item xs={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="caption" color="text.secondary">{k.label}</Typography>
                <Typography variant="h6" fontWeight={700}>{Number(k.value || 0).toFixed(2)}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}

