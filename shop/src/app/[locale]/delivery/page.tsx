"use client";
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Box, Button, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import { DataTable } from '@/components/mui/DataTable';
import { GridColDef } from '@mui/x-data-grid';

type Shipment = {
  _id: string;
  saleId: string;
  provider: string;
  externalId: string;
  labelUrl?: string;
  policyUrl?: string;
  status: 'created'|'in_transit'|'out_for_delivery'|'delivered'|'failed'|'returned';
  moneyStatus: 'pending'|'with_delivery_company'|'remitted_to_shop';
  createdAt: number;
};

export default function DeliveryBoard() {
  const t = useTranslations();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'created'|'in_transit'|'out_for_delivery'|'delivered'|'failed_returned'>('created');

  async function fetchShipments() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tab === 'failed_returned') {
        params.append('status', 'failed');
        params.append('status', 'returned');
      } else {
        params.append('status', tab);
      }
      if (q) params.set('q', q);
      const res = await fetch(`/api/delivery/shipments?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setShipments(data.shipments || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchShipments(); }, [tab]);

  const grouped = useMemo(() => shipments, [shipments]);

  const columns: GridColDef[] = useMemo(() => ([
    { field: 'externalId', headerName: '#', width: 160 },
    { field: 'status', headerName: t('delivery.status') as string, width: 180 },
    { field: 'moneyStatus', headerName: t('delivery.moneyStatus') as string, width: 200 },
    { field: 'createdAt', headerName: t('delivery.createdAt') as string, width: 220, valueFormatter: (p) => new Date(p.value as number).toLocaleString() },
    { field: 'actions', headerName: t('delivery.actions') as string, width: 260, sortable: false, renderCell: (p) => {
      const s = p.row as Shipment;
      return (
        <Stack direction="row" spacing={1}>
          {s.labelUrl && <Button size="small" component="a" href={s.labelUrl} target="_blank">{t('delivery.label')}</Button>}
          <Button size="small" variant="outlined" onClick={async () => { await fetch('/api/delivery/shipments/refresh', { method: 'POST' }); fetchShipments(); }}>{t('delivery.refresh')}</Button>
          {s.status === 'delivered' && s.moneyStatus !== 'remitted_to_shop' && (
            <Button size="small" variant="contained" color="success" onClick={async () => { await fetch(`/api/delivery/shipments/${s._id}/mark-remitted`, { method: 'POST', headers: { 'Idempotency-Key': `${s._id}:remit:${Date.now()}` } }); fetchShipments(); }}>{t('delivery.markRemitted')}</Button>
          )}
        </Stack>
      );
    } },
  ]), [t]);

  return (
    <Box component="main" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Stack direction="row" alignItems="center" gap={1}>
        <Typography variant="h6" fontWeight={600}>{t('delivery.title')}</Typography>
        <Stack direction="row" spacing={1} sx={{ ml: 'auto' }}>
          <TextField size="small" placeholder={t('delivery.searchPlaceholder') as string} value={q} onChange={(e) => setQ(e.target.value)} />
          <Button variant="outlined" onClick={() => fetchShipments()}>{t('delivery.refresh')}</Button>
        </Stack>
      </Stack>

      <Tabs value={tab} onChange={(_e, v) => setTab(v)} variant="scrollable" scrollButtons allowScrollButtonsMobile>
        <Tab value="created" label={t('delivery.new') as string} />
        <Tab value="in_transit" label={t('delivery.inTransit') as string} />
        <Tab value="out_for_delivery" label={t('delivery.outForDelivery') as string} />
        <Tab value="delivered" label={t('delivery.delivered') as string} />
        <Tab value="failed_returned" label={`${t('delivery.failed')}/${t('delivery.returned')}`} />
      </Tabs>

      <DataTable rows={grouped} columns={columns} loading={loading} getRowId={(r) => (r as Shipment)._id} autoHeight />
    </Box>
  );
}



