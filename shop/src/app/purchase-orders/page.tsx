"use client";
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import { DataTable } from '@/components/mui/DataTable';
import { GridColDef } from '@mui/x-data-grid';

type PO = {
  _id: string;
  poNumber?: string;
  supplierId?: string;
  status: 'draft' | 'partial' | 'received' | 'cancelled' | string;
  totals?: { grandTotal?: number };
  receivedAt?: string;
};

export default function PurchaseOrdersPage() {
  const [status, setStatus] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [rows, setRows] = useState<PO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    const url = new URL('/api/purchase-orders', window.location.origin);
    if (status) url.searchParams.set('status', status);
    if (search) url.searchParams.set('search', search);
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(url.toString(), { cache: 'no-store' });
        const data = await res.json();
        if (!cancelled) setRows(data.purchaseOrders || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [status, search]);

  const columns: GridColDef[] = useMemo(() => ([
    { field: 'poNumber', headerName: 'رقم الأمر', width: 160, renderCell: (p) => (
      <Link href={`/purchase-orders/${(p.row as PO)._id}`} style={{ textDecoration: 'underline' }}>{p.value as string}</Link>
    ) },
    { field: 'supplierId', headerName: 'المورد', width: 180 },
    { field: 'status', headerName: 'الحالة', width: 160, valueFormatter: (p) => (
      p.value === 'draft' ? 'مسودة' : p.value === 'partial' ? 'تم الاستلام جزئيًا' : p.value === 'received' ? 'تم الاستلام' : 'ملغي'
    ) },
    { field: 'grandTotal', headerName: 'الإجمالي', width: 140, valueGetter: (p) => p.row.totals?.grandTotal, valueFormatter: (p) => (
      (typeof p.value === 'number' ? (p.value as number).toFixed(2) : '-')
    ) },
    { field: 'receivedAt', headerName: 'تم الاستلام', width: 220, valueFormatter: (p) => (
      p.value ? new Date(p.value as string).toLocaleString() : '-'
    ) },
  ]), []);

  return (
    <Box component="main" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }} dir="rtl">
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h6" fontWeight={600}>أوامر الشراء</Typography>
        <Button onClick={() => window.location.href='/purchase-orders/new'} variant="contained" color="success">جديد</Button>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'stretch', md: 'center' }}>
        <TextField size="small" select SelectProps={{ native: true }} value={status} onChange={(e) => setStatus(e.target.value)} sx={{ width: { xs: '100%', md: 220 } }}>
          <option value="">الحالة</option>
          <option value="draft">مسودة</option>
          <option value="partial">تم الاستلام جزئيًا</option>
          <option value="received">تم الاستلام</option>
          <option value="cancelled">ملغي</option>
        </TextField>
        <TextField size="small" placeholder="بحث" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ flex: 1 }} />
      </Stack>

      <DataTable rows={rows} columns={columns} loading={loading} getRowId={(r) => (r as PO)._id} autoHeight />
    </Box>
  );
}

