"use client";
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { LocationSwitcher } from '@/components/pos/LocationSwitcher';
import { VirtualTable } from '@/components/virtualized/VirtualTable';
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';

export default function StockPage() {
  const t = useTranslations();
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [locationId, setLocationId] = useState<string>('');
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);

  useEffect(() => {
    if (!locationId) return;
    (async () => {
      const params = new URLSearchParams();
      params.set('locationId', locationId);
      if (q) params.set('q', q);
      const res = await fetch('/api/stock?' + params.toString());
      if (res.ok) {
        const data = await res.json();
        const list = (data.availability || []).map((a: any) => ({ sku: a.sku, onHand: a.onHand, reserved: a.reserved, available: a.available }));
        setRows(list);
      }
    })();
  }, [locationId, q]);

  const csv = useMemo(() => {
    const header = ['SKU','المتاح','المحجوز','المخزون'];
    const lines = rows.map((r) => [r.sku, r.available, r.reserved, r.onHand].join(','));
    return [header.join(','), ...lines].join('\n');
  }, [rows]);

  const columns = useMemo(() => ([
    { key: 'sku', header: 'SKU', width: 200 },
    { key: 'available', header: 'المتاح', width: 140 },
    { key: 'reserved', header: 'المحجوز', width: 140 },
    { key: 'onHand', header: 'المخزون', width: 140 },
  ]), []);

  return (
    <Box component="main" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {offline && (
        <Alert severity="warning" variant="outlined" sx={{ fontSize: 12 }}>{t('reports.offlineBanner') || 'عرض بيانات مخزنة مؤقتًا'}</Alert>
      )}
      <Stack direction="row" alignItems="center" spacing={1}>
        <LocationSwitcher />
        <TextField size="small" placeholder={t('products.searchPlaceholder') || 'بحث'} value={q} onChange={(e)=> setQ(e.target.value)} />
        <Button component="a" href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`} download={`stock-${locationId}.csv`} variant="outlined">CSV</Button>
      </Stack>
      <VirtualTable rows={rows} columns={columns as any} rowKey={(r:any)=> r.sku} />
    </Box>
  );
}
