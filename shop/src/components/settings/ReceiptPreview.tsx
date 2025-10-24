"use client";
import { ReceiptData } from '@/lib/pos/types';
import { Box, Divider, Paper, Stack, Typography } from '@mui/material';

export function ReceiptPreview({ data, template }: { data: ReceiptData; template: any }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box sx={{ width: template === 'a4' ? 595 : '80mm', mx: 'auto' }} dir="rtl">
        <Typography align="center" fontWeight={600} sx={{ mb: 1 }}>الإيصال</Typography>
        <Stack spacing={0.75}>
          {data.lines.map((l) => (
            <Stack key={l.sku} direction="row" alignItems="center" justifyContent="space-between">
              <Typography sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}{(l.size || l.color) ? ` (${[l.size, l.color].filter(Boolean).join(', ')})` : ''}</Typography>
              <Typography>{l.qty} × {l.price.toFixed(2)}</Typography>
            </Stack>
          ))}
        </Stack>
        <Divider sx={{ my: 1 }} />
        <Stack spacing={0.5} sx={{ fontSize: 12 }}>
          {data.payments.map((p) => (
            <Stack key={p.seq} direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="caption">
                {p.method === 'cash' && 'دفع نقدًا'}
                {p.method === 'card' && `بطاقة`}
                {p.method === 'transfer' && `حوالة`}
                {p.method === 'store_credit' && `رصيد المتجر`}
              </Typography>
              <Typography variant="caption">{p.amount.toFixed(2)}</Typography>
            </Stack>
          ))}
        </Stack>
        <Divider sx={{ my: 1 }} />
        <Stack spacing={0.5}>
          <Stack direction="row" justifyContent="space-between"><Typography>المجموع قبل الضريبة</Typography><Typography>{data.totals.subtotal.toFixed(2)}</Typography></Stack>
          <Stack direction="row" justifyContent="space-between"><Typography>الضريبة</Typography><Typography>{data.totals.tax.toFixed(2)}</Typography></Stack>
          <Stack direction="row" justifyContent="space-between"><Typography fontWeight={600}>الإجمالي النهائي</Typography><Typography fontWeight={600}>{data.totals.grand.toFixed(2)}</Typography></Stack>
        </Stack>
      </Box>
    </Paper>
  );
}

