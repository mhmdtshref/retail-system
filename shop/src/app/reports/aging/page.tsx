"use client";
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Box, Grid, Paper, Stack, TextField, Typography } from '@mui/material';

function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function AgingReportPage() {
  const t = useTranslations('reports');
  const [from, setFrom] = useState(todayIso());
  const [to, setTo] = useState(todayIso());
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/reports/aging?type=layaway&from=${from}&to=${to}`);
        const json = await res.json();
        setData(json.data);
      } finally { setLoading(false); }
    })();
  }, [from, to]);

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6" fontWeight={600}>{t('aging')}</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
        <TextField size="small" type="date" value={from} onChange={(e)=> setFrom(e.target.value)} />
        <TextField size="small" type="date" value={to} onChange={(e)=> setTo(e.target.value)} />
      </Stack>
      {loading && <Typography variant="body2">...</Typography>}
      {data && (
        <Grid container spacing={1}>
          {data.buckets?.map((b: any) => (
            <Grid key={b.key} item xs={6} md={4}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="caption" color="text.secondary">{b.key}</Typography>
                <Typography variant="h6" fontWeight={700}>{Number(b.balance || 0).toFixed(2)}</Typography>
                <Typography variant="caption" color="text.secondary">{b.count}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}

