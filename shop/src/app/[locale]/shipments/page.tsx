"use client";
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import { DataTable } from '@/components/mui/DataTable';
import { GridColDef } from '@mui/x-data-grid';

type Shipment = {
  _id: string;
  orderId: string;
  carrier: string;
  trackingNumber?: string;
  status: 'created'|'label_generated'|'handover'|'in_transit'|'out_for_delivery'|'delivered'|'failed'|'returned'|'cancelled';
  to: { name: string; city: string; country: string };
  cod?: { enabled?: boolean };
  labelUrl?: string;
  updatedAt: string;
  createdAt: string;
};

export default function ShipmentsPage() {
  const t = useTranslations();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [filters, setFilters] = useState<{ carrier?: string; status?: string; city?: string; cod?: string; from?: string; to?: string }>({});
  const [loading, setLoading] = useState(false);

  async function fetchShipments() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.carrier) params.append('carrier', filters.carrier);
      if (filters.status) params.append('status', filters.status);
      if (filters.city) params.append('city', filters.city);
      if (filters.cod) params.append('cod', filters.cod);
      if (filters.from) params.append('dateFrom', String(new Date(filters.from).getTime()));
      if (filters.to) params.append('dateTo', String(new Date(filters.to).getTime()));
      const res = await fetch(`/api/shipments?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setShipments(data.shipments || []);
      }
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchShipments(); }, []);

  const list = useMemo(() => shipments, [shipments]);

  const columns: GridColDef[] = useMemo(() => ([
    { field: 'customer', headerName: t('delivery.customer') as string, flex: 1, valueGetter: (p) => p.row.to?.name },
    { field: 'carrier', headerName: 'شركة الشحن', width: 160 },
    { field: 'trackingNumber', headerName: 'رقم التتبع', width: 180, valueFormatter: (p) => p.value || '—' },
    { field: 'status', headerName: t('delivery.status') as string, width: 180 },
    { field: 'city', headerName: t('delivery.city') as string, width: 160, valueGetter: (p) => p.row.to?.city },
    { field: 'createdAt', headerName: t('delivery.createdAt') as string, width: 220, valueFormatter: (p) => new Date(p.value as string).toLocaleString() },
    { field: 'actions', headerName: t('delivery.actions') as string, width: 220, sortable: false, renderCell: (p) => (
      <Stack direction="row" spacing={1}>
        {(p.row as Shipment).labelUrl && <Button size="small" component="a" href={(p.row as Shipment).labelUrl} target="_blank">{t('delivery.label')}</Button>}
        <Button size="small" component="a" href={`/api/shipments?id=${(p.row as Shipment)._id}`} target="_blank">تفاصيل</Button>
      </Stack>
    ) },
  ]), [t]);

  return (
    <Box component="main" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Stack direction="row" alignItems="center" gap={1}>
        <Typography variant="h6" fontWeight={600}>{t('delivery.title')}</Typography>
        <Stack direction="row" spacing={1} sx={{ ml: 'auto' }}>
          <TextField size="small" select SelectProps={{ native: true }} value={filters.status || ''} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || undefined }))}>
            <option value="">— {t('delivery.status')}</option>
            <option value="created">جديدة</option>
            <option value="in_transit">جاري الشحن</option>
            <option value="out_for_delivery">خارج للتسليم</option>
            <option value="delivered">تم التسليم</option>
            <option value="failed">فشل التسليم</option>
            <option value="returned">مرتجع</option>
            <option value="cancelled">ملغاة</option>
          </TextField>
          <TextField size="small" placeholder={t('delivery.city') as string} value={filters.city || ''} onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value || undefined }))} />
          <TextField size="small" select SelectProps={{ native: true }} value={filters.cod || ''} onChange={(e) => setFilters((f) => ({ ...f, cod: e.target.value || undefined }))}>
            <option value="">COD</option>
            <option value="true">نعم</option>
            <option value="false">لا</option>
          </TextField>
          <Button variant="outlined" onClick={() => fetchShipments()}>{t('delivery.refresh')}</Button>
        </Stack>
      </Stack>

      <DataTable rows={list} columns={columns} loading={loading} getRowId={(r) => (r as Shipment)._id} autoHeight />
    </Box>
  );
}

