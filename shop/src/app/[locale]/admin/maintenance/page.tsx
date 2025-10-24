"use client";
import useSWR from 'swr';
import { useLocale } from 'next-intl';
import { Box, Typography } from '@mui/material';
import { DataTable } from '@/components/mui/DataTable';
import type { GridColDef } from '@mui/x-data-grid';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function Page() {
  const locale = useLocale();
  const { data } = useSWR(`/api/admin/backup`, fetcher);
  const rows = (data?.jobs || []).map((j: any, i: number) => ({ id: j._id || i, ...j }));
  const columns: GridColDef[] = [
    { field: 'createdAt', headerName: 'التاريخ', width: 220, valueFormatter: ({ value }) => new Date(value as string).toLocaleString(locale) },
    { field: 'collections', headerName: 'المجموعات', flex: 1, minWidth: 200, valueGetter: ({ row }: any) => (row.collections || []).join(', ') },
    { field: 'status', headerName: 'الحالة', width: 160 },
    { field: 'bytes', headerName: 'الحجم', width: 140 },
  ];
  return (
    <Box dir="rtl" component="main" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6" fontWeight={600}>الصيانة</Typography>
      <DataTable rows={rows} columns={columns} autoHeight />
    </Box>
  );
}
