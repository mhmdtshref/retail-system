"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { saveTrackSnapshot, loadTrackSnapshot } from '@/lib/offline/track-cache';
import { Box, Typography, Alert, Stack, Paper, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';

type TrackData = {
  header: { orderId: string; code: string; status: string; progressPct: number };
  shipments: any[];
  items?: any[];
  payments?: any;
  shippingTo?: any;
};

export default function TrackOrderPage({ params }: { params: { id: string } }) {
  const search = useSearchParams();
  const t = search.get('t') || '';
  const id = params.id;
  const [intervalMs, setIntervalMs] = useState(15000);
  const [data, setData] = useState<TrackData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let mounted = true;
    let timer: any;
    async function loadOnce() {
      if (!t) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/public/orders/${id}?t=${encodeURIComponent(t)}`);
        const json = await res.json();
        if (!mounted) return;
        if (!res.ok) { setError(json?.error || 'error'); setLoading(false); return; }
        setData(json);
        setError(null);
      } catch (e: any) {
        if (mounted) setError('network');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    async function tick() {
      try {
        await fetch('/api/public/track/refresh', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderId: id, t }) });
        await loadOnce();
        setIntervalMs((cur: number) => Math.min(cur * 2, 60000));
      } catch {}
      timer = setTimeout(tick, intervalMs);
    }
    loadOnce();
    timer = setTimeout(tick, intervalMs);
    return () => { mounted = false; clearTimeout(timer); };
  }, [id, t, intervalMs]);

  // Save snapshot when online; attempt load when offline
  useEffect(() => {
    if (data?.header?.orderId && data?.header?.code) {
      saveTrackSnapshot({ orderId: data.header.orderId, code: data.header.code, snapshotJson: data });
      setOffline(false);
    }
  }, [data]);
  useEffect(() => {
    async function maybeLoad() {
      if (!navigator.onLine && t) {
        const snap = await loadTrackSnapshot(id);
        if (snap) {
          setOffline(true);
        }
      }
    }
    maybeLoad();
    function onOnline() { setOffline(false); mutate(); }
    function onOffline() { setOffline(true); }
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [id, t, mutate]);

  const shipments = useMemo(() => data?.shipments || [], [data]);
  const header = data?.header;
  const items = data?.items || [];
  const payments = data?.payments || {};
  const shippingTo = data?.shippingTo;
  const cod = shipments.some((s: any) => s?.cod?.enabled);

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: 2 }} dir="rtl">
      <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>تتبع الطلب <bdi dir="ltr">{header?.code}</bdi></Typography>
      {header?.status === 'delivered' && (
        <Alert severity="success" sx={{ mb: 2 }}>تم التسليم</Alert>
      )}
      {cod && header?.status !== 'delivered' && (
        <Alert severity="warning" sx={{ mb: 2 }}>المبلغ سيتم تحصيله عند التسليم</Alert>
      )}
      {offline && (
        <Alert severity="info" sx={{ mb: 2 }}>تم عرض آخر حالة معروفة. سيتم التحديث عند الاتصال.</Alert>
      )}
      {error && <Typography color="error" variant="body2">حدث خطأ في التحميل</Typography>}
      {loading && <Typography variant="body2" color="text.secondary">جاري التحميل…</Typography>}
      {header && (
        <Paper variant="outlined" sx={{ position: 'sticky', top: 0, backdropFilter: 'blur(6px)', p: 2, mb: 2 }}>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2">الحالة: <b>{translateStatus(header.status)}</b></Typography>
            <Typography variant="body2">التقدم: {header.progressPct}%</Typography>
          </Stack>
        </Paper>
      )}
      <Stack spacing={2}>
        {shippingTo && (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography fontWeight={600} sx={{ mb: 1 }}>العنوان</Typography>
            <Typography variant="body2">{shippingTo.name}</Typography>
            <Typography variant="body2">{shippingTo.address1}</Typography>
            <Typography variant="body2">{shippingTo.city}، {shippingTo.country}</Typography>
          </Paper>
        )}

        {items.length > 0 && (
          <Paper variant="outlined">
            <Table size="small" aria-label="items">
              <TableHead>
                <TableRow>
                  <TableCell align="right">العنصر</TableCell>
                  <TableCell align="right">الخيارات</TableCell>
                  <TableCell align="right">الكمية</TableCell>
                  <TableCell align="right">السعر</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((it: any, idx: number) => (
                  <TableRow key={idx} hover>
                    <TableCell align="right">{it.name}</TableCell>
                    <TableCell align="right">{[it.size, it.color].filter(Boolean).join(' / ')}</TableCell>
                    <TableCell align="right">{it.qty}</TableCell>
                    <TableCell align="right"><bdi dir="ltr">{Number(it.price).toFixed(2)}</bdi></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        )}

        {payments && (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography fontWeight={600} sx={{ mb: 1 }}>ملخص الدفع</Typography>
            <Stack direction="row" justifyContent="space-between"><Typography component="span">الإجمالي الفرعي</Typography><bdi dir="ltr">{Number(payments.subtotal || 0).toFixed(2)}</bdi></Stack>
            <Stack direction="row" justifyContent="space-between"><Typography component="span">الإجمالي</Typography><bdi dir="ltr">{Number(payments.grand || 0).toFixed(2)}</bdi></Stack>
            <Stack direction="row" justifyContent="space-between"><Typography component="span">المدفوع</Typography><bdi dir="ltr">{Number(payments.paid || 0).toFixed(2)}</bdi></Stack>
            <Stack direction="row" justifyContent="space-between"><Typography component="span">المتبقي</Typography><bdi dir="ltr">{Number(payments.balance || 0).toFixed(2)}</bdi></Stack>
          </Paper>
        )}

        {shipments.map((s: any) => (
          <Paper key={s.id} variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="body2">شركة الشحن: <b>{s.carrier?.toUpperCase()}</b></Typography>
              <Typography variant="body2">رقم التتبع: <bdi dir="ltr">{s.trackingNumber || '-'}</bdi></Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>الحالة: {translateStatus(s.status)}</Typography>
            <Stack component="ol" spacing={0.5} sx={{ listStyle: 'none', p: 0, m: 0 }}>
              {(s.events || []).slice().reverse().map((e: any, idx: number) => (
                <Typography component="li" key={idx} aria-label={`الحدث ${translateStatus(e.status)} عند ${new Date(e.at).toLocaleString('ar-SA')}`} variant="body2">• {translateStatus(e.status)} — <bdi dir="ltr">{new Date(e.at).toLocaleString('ar-SA')}</bdi></Typography>
              ))}
            </Stack>
          </Paper>
        ))}
        {!shipments.length && !loading && (
          <Typography variant="body2" color="text.secondary">لا توجد شحنات بعد.</Typography>
        )}
      </Stack>
    </Box>
  );
}

function translateStatus(s?: string) {
  switch (s) {
    case 'created': return 'تم الإنشاء';
    case 'label_generated': return 'تم إصدار الملصق';
    case 'handover': return 'تم التسليم لشركة الشحن';
    case 'in_transit': return 'قيد الشحن';
    case 'out_for_delivery': return 'خارج للتسليم';
    case 'delivered': return 'تم التسليم';
    case 'failed': return 'تعذّر التسليم';
    case 'returned': return 'مرتجع';
    case 'cancelled': return 'ملغاة';
    default: return s || '';
  }
}

