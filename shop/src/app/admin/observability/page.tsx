"use client";
import { Suspense, useMemo } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { DataTable } from '@/components/mui/DataTable';
import { GridColDef } from '@mui/x-data-grid';

async function fetchSummary() {
  const res = await fetch('/api/obs/summary', { cache: 'no-store' });
  if (!res.ok) throw new Error('failed');
  return res.json();
}

function Cards({ data }: { data: any }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 1 }} dir="rtl">
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">أخطاء (24 ساعة)</Typography>
        <Typography variant="h5" fontWeight={700}>{data?.errors?.last24h || 0}</Typography>
      </Paper>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">الطلبات/الدقيقة</Typography>
        <Typography variant="h5" fontWeight={700}>—</Typography>
      </Paper>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">زمن الاستجابة P95</Typography>
        <Typography variant="h5" fontWeight={700}>—</Typography>
      </Paper>
    </Box>
  );
}

function ErrorsTable({ items }: { items: any[] }) {
  const columns: GridColDef[] = useMemo(() => ([
    { field: 'id', headerName: 'المعرف', width: 200 },
    { field: 'time', headerName: 'الوقت', width: 220, valueFormatter: (p) => new Date(p.value as number).toLocaleString('ar-SA') },
    { field: 'route', headerName: 'المسار', flex: 1 },
    { field: 'method', headerName: 'الطريقة', width: 120 },
    { field: 'summary', headerName: 'الملخص', flex: 1.2 },
  ]), []);
  return <DataTable rows={items} columns={columns} getRowId={(r) => (r as any).id} autoHeight />;
}

function SlowQueriesTable({ items }: { items: any[] }) {
  const columns: GridColDef[] = useMemo(() => ([
    { field: 'collection', headerName: 'المجموعة', width: 220 },
    { field: 'op', headerName: 'العملية', width: 140 },
    { field: 'ms', headerName: 'المدة (مللي ثانية)', width: 180 },
    { field: 'ts', headerName: 'الوقت', width: 220, valueFormatter: (p) => new Date(p.value as number).toLocaleString('ar-SA') },
  ]), []);
  const withIds = items.map((it: any, idx: number) => ({ id: idx, ...it }));
  return <DataTable rows={withIds} columns={columns} autoHeight />;
}

export default async function ObservabilityPage() {
  const data = await fetchSummary();
  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6" fontWeight={600} dir="rtl">المراقبة</Typography>
      <Suspense fallback={<div>...</div>}><Cards data={data} /></Suspense>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>
        <Box>
          <Typography fontWeight={600} mb={1} dir="rtl">أحدث الأخطاء</Typography>
          <ErrorsTable items={data?.errors?.latest || []} />
        </Box>
        <Box>
          <Typography fontWeight={600} mb={1} dir="rtl">استعلامات بطيئة</Typography>
          <SlowQueriesTable items={data?.slowQueries || []} />
        </Box>
      </Box>
    </Box>
  );
}
