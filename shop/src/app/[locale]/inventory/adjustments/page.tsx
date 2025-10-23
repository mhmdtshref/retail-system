"use client";
import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { DataTable } from '@/components/mui/DataTable';
import { GridColDef } from '@mui/x-data-grid';

type Adjustment = {
  _id: string;
  lines: Array<{ sku: string; quantity: number; reason: string; note?: string }>;
  note?: string;
  postedAt: string;
  createdBy?: string;
};

export default function AdjustmentsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [items, setItems] = useState<Adjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sku, setSku] = useState('');
  const [qty, setQty] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [reasons, setReasons] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);
  const [onHand, setOnHand] = useState<number | null>(null);
  const [filters, setFilters] = useState<{ sku?: string; reason?: string; user?: string; dateFrom?: string; dateTo?: string }>({});

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/inventory/adjustments');
        const data = await res.json();
        setItems(data.adjustments || []);
        const res2 = await fetch('/api/settings/inventory');
        if (res2.ok) {
          const settings = await res2.json();
          setReasons(settings.reasons || []);
        }
      } catch (e: any) {
        setError(e?.message || 'خطأ');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      if (!sku) { setOnHand(null); return; }
      try {
        const url = new URL('/api/inventory/availability/bulk', window.location.origin);
        url.searchParams.set('skus', sku);
        const res = await fetch(url.toString(), { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          const a = (data.availability || []).find((x: any) => x.sku === sku);
          setOnHand(a ? a.onHand : 0);
        }
      } catch {}
    })();
    return () => controller.abort();
  }, [sku]);

  function exportCsv() {
    const rows: string[] = [];
    rows.push(['SKU','Quantity','Reason','User','Date','Note'].join(','));
    for (const a of items) {
      for (const l of a.lines) {
        rows.push([l.sku, String(l.quantity), l.reason || '', a.createdBy || '', new Date(a.postedAt).toISOString(), (l.note || a.note || '').replace(/\n/g,' ')].join(','));
      }
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `adjustments-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const columns: GridColDef[] = useMemo(() => ([
    { field: 'sku', headerName: 'SKU', width: 160, renderCell: (p) => <bdi dir="ltr">{p.value as string}</bdi> },
    { field: 'quantity', headerName: 'الكمية', width: 120, valueFormatter: (p) => new Intl.NumberFormat(locale).format(p.value as number) },
    { field: 'reason', headerName: 'السبب', width: 160 },
    { field: 'createdBy', headerName: 'المستخدم', width: 160 },
    { field: 'postedAt', headerName: 'التاريخ', width: 220, valueFormatter: (p) => new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(p.value as string)) },
    { field: 'note', headerName: 'ملاحظات', flex: 1 },
  ]), [locale]);

  const rows = useMemo(() => items.flatMap((a) => a.lines.map((l, idx) => ({
    id: `${a._id}-${idx}`,
    sku: l.sku,
    quantity: l.quantity,
    reason: l.reason,
    createdBy: a.createdBy || '',
    postedAt: a.postedAt,
    note: l.note || a.note || '',
  }))), [items]);

  return (
    <Box component="main" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h6" fontWeight={600}>التسويات</Typography>
        <Stack direction="row" spacing={1}>
          <Button component="a" href={`/${locale}/inventory/counts`} variant="text">الجرد الدوري</Button>
          <Button variant="contained" onClick={exportCsv}>تصدير CSV</Button>
        </Stack>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'stretch', md: 'flex-end' }}>
          <Stack>
            <Typography variant="caption" color="text.secondary">SKU</Typography>
            <TextField size="small" placeholder="SKU/باركود" value={filters.sku || ''} onChange={(e) => setFilters({ ...filters, sku: e.target.value })} />
          </Stack>
        <Stack>
          <Typography variant="caption" color="text.secondary">السبب</Typography>
          <TextField size="small" placeholder="السبب" value={filters.reason || ''} onChange={(e) => setFilters({ ...filters, reason: e.target.value })} />
        </Stack>
        <Stack>
          <Typography variant="caption" color="text.secondary">المستخدم</Typography>
          <TextField size="small" placeholder="المستخدم" value={filters.user || ''} onChange={(e) => setFilters({ ...filters, user: e.target.value })} />
        </Stack>
        <Stack>
          <Typography variant="caption" color="text.secondary">من تاريخ</Typography>
          <TextField size="small" type="date" value={filters.dateFrom || ''} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} />
        </Stack>
        <Stack>
          <Typography variant="caption" color="text.secondary">إلى تاريخ</Typography>
          <TextField size="small" type="date" value={filters.dateTo || ''} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} />
        </Stack>
        <Button variant="outlined" onClick={async () => {
          const url = new URL('/api/inventory/adjustments', window.location.origin);
          if (filters.sku) url.searchParams.set('sku', filters.sku);
          if (filters.reason) url.searchParams.set('reason', filters.reason);
          if (filters.user) url.searchParams.set('user', filters.user);
          if (filters.dateFrom) url.searchParams.set('dateFrom', String(new Date(filters.dateFrom).getTime()));
          if (filters.dateTo) url.searchParams.set('dateTo', String(new Date(filters.dateTo).getTime()));
          const res = await fetch(url.toString());
          if (res.ok) {
            const data = await res.json();
            setItems(data.adjustments || []);
          }
        }}>تطبيق التصفية</Button>
        </Stack>
      </Paper>

      {loading ? <Typography>جارٍ التحميل...</Typography> : error ? <Typography color="error.main">{error}</Typography> : (
        <DataTable rows={rows} columns={columns} autoHeight />
      )}
    </Box>
  );
}


