"use client";
import { useEffect, useState } from 'react';
import { Box, Button, Drawer, Paper, Stack, Typography } from '@mui/material';

type Props = { customerId: string | null; onClose: () => void };

export function MiniProfileDrawer({ customerId, onClose }: Props) {
  const [data, setData] = useState<any | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!customerId) { setData(null); return; }
      try {
        const res = await fetch(`/api/customers/${customerId}`);
        if (res.ok) {
          const d = await res.json();
          if (!cancelled) setData(d.customer);
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [customerId]);

  if (!customerId) return null;
  return (
    <Drawer anchor="left" open onClose={onClose} PaperProps={{ sx: { width: 320 } }}>
      <Box sx={{ p: 2, borderBottom: (t)=> `1px solid ${t.palette.divider}` }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography fontWeight={600}>العميل</Typography>
          <Button onClick={onClose}>✕</Button>
        </Stack>
      </Box>
      <Box sx={{ p: 2 }}>
        {data ? (
          <>
            <Typography variant="subtitle1" fontWeight={700}>{data.fullName_ar || data.fullName_en}</Typography>
            <Typography variant="caption" color="text.secondary">{(data.phones || []).map((p: any) => p.e164).join(' • ')}</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mt: 2 }}>
              <Paper variant="outlined" sx={{ p: 1 }}>
                <Typography variant="caption" color="text.secondary">إجمالي المشتريات</Typography>
                <Typography fontWeight={600}>{(data.stats?.lifetimeSpend || 0).toFixed(2)}</Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 1 }}>
                <Typography variant="caption" color="text.secondary">عدد الطلبات</Typography>
                <Typography fontWeight={600}>{data.stats?.ordersCount || 0}</Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 1 }}>
                <Typography variant="caption" color="text.secondary">آخر طلب</Typography>
                <Typography fontWeight={600}>{data.stats?.lastOrderAt ? new Date(data.stats.lastOrderAt).toLocaleDateString() : '—'}</Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 1 }}>
                <Typography variant="caption" color="text.secondary">رصيد المتجر</Typography>
                <Typography fontWeight={600}>{(data.stats?.storeCredit || 0).toFixed(2)}</Typography>
              </Paper>
            </Box>
            <Button href={`/customers/${data._id}`} target="_blank" rel="noopener" variant="outlined" sx={{ mt: 2 }}>الملف الكامل</Button>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">...تحميل</Typography>
        )}
      </Box>
    </Drawer>
  );
}

