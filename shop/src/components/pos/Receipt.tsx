"use client";
import { ReceiptData } from '@/lib/pos/types';
import { useEffect, useState } from 'react';
import { getCachedSettings } from '@/lib/offline/settings-cache';
import { Box, Divider, Stack, Typography } from '@mui/material';

export function Receipt({ data }: { data: ReceiptData }) {
  const [tpl, setTpl] = useState<any | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const s = await res.json();
          setTpl(s?.receipts?.thermal80 || null);
          return;
        }
      } catch {}
      const cached = await getCachedSettings();
      setTpl(cached?.receipts?.thermal80 || null);
    })();
  }, []);
  return (
    <Box dir="rtl" sx={{ width: '80mm', mx: 'auto', fontSize: 14 }}>
      {tpl?.header?.ar && <Typography align="center" sx={{ mb: 1 }}>{tpl.header.ar}</Typography>}
      <Typography align="center" fontWeight={600} sx={{ mb: 1 }}>الإيصال</Typography>
      <Stack spacing={0.5}>
        {data.lines.map((l) => (
          <Stack key={l.sku} direction="row" alignItems="center" justifyContent="space-between">
            <Typography sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {l.name}{(l.size || l.color) ? ` (${[l.size, l.color].filter(Boolean).join(', ')})` : ''}
            </Typography>
            <Typography>{l.qty} × {l.price.toFixed(2)}</Typography>
          </Stack>
        ))}
      </Stack>
      <Divider sx={{ my: 1 }} />
      <Stack spacing={0.25}>
        {data.payments.map((p) => (
          <Stack key={p.seq} direction="row" alignItems="center" justifyContent="space-between" sx={{ fontSize: 12 }}>
            <Typography variant="caption">
              {p.method === 'cash' && 'دفع نقدًا'}
              {p.method === 'card' && `طريقة الدفع: بطاقة`}
              {p.method === 'transfer' && `حوالة بنكية`}
              {p.method === 'store_credit' && `تم استخدام رصيد المتجر`}
              {p.meta?.reservationNote ? ` (${p.meta?.reservationNote})` : ''}
            </Typography>
            <Typography variant="caption">{p.amount.toFixed(2)}</Typography>
          </Stack>
        ))}
      </Stack>
      <Divider sx={{ my: 1 }} />
      <Stack spacing={0.5}>
        <Stack direction="row" justifyContent="space-between"><Typography>المجموع قبل الضريبة</Typography><Typography>{data.totals.subtotal.toFixed(2)}</Typography></Stack>
        <Stack direction="row" justifyContent="space-between"><Typography>الضريبة</Typography><Typography>{data.totals.tax.toFixed(2)}</Typography></Stack>
        {data.appliedDiscounts && data.appliedDiscounts.length > 0 && (
          <Box sx={{ mt: 0.5 }}>
            <Typography fontWeight={600}>التخفيضات</Typography>
            {data.appliedDiscounts.map((d) => (
              <Stack key={d.traceId} direction="row" justifyContent="space-between" sx={{ fontSize: 12 }}>
                <Typography variant="caption">{d.label}</Typography>
                <Typography variant="caption">-{Number(d.amount || 0).toFixed(2)}</Typography>
              </Stack>
            ))}
            <Stack direction="row" justifyContent="space-between" sx={{ fontSize: 12 }}>
              <Typography variant="caption">إجمالي التوفير</Typography>
              <Typography variant="caption">-{data.appliedDiscounts.reduce((s: number, a: any)=> s + (a.amount || 0), 0).toFixed(2)}</Typography>
            </Stack>
            {data.pendingCouponRedemption && (
              <Typography color="warning.main" sx={{ fontSize: 11, mt: 0.5 }}>قيد التحقق من القسيمة</Typography>
            )}
          </Box>
        )}
        {typeof data.totals.roundingAdj === 'number' && data.totals.roundingAdj !== 0 && (
          <Stack direction="row" justifyContent="space-between" sx={{ fontSize: 12 }}>
            <Typography variant="caption">تعديل التقريب</Typography>
            <Typography variant="caption">{data.totals.roundingAdj > 0 ? '+' : ''}{data.totals.roundingAdj.toFixed(2)}</Typography>
          </Stack>
        )}
        <Stack direction="row" justifyContent="space-between"><Typography fontWeight={600}>الإجمالي النهائي</Typography><Typography fontWeight={600}>{data.totals.grand.toFixed(2)}</Typography></Stack>
        {data.totals.taxByRate && data.totals.taxByRate.length > 0 && (
          <Box sx={{ mt: 1, fontSize: 11 }}>
            <Typography fontWeight={600}>ملخص الضريبة حسب النسبة</Typography>
            {data.totals.taxByRate.map((r)=> (
              <Stack key={r.rate} direction="row" justifyContent="space-between">
                <Typography>{Math.round(r.rate*100)}%</Typography>
                <Typography>{r.taxable.toFixed(2)} / {r.tax.toFixed(2)}</Typography>
              </Stack>
            ))}
          </Box>
        )}
        {data.totals.priceMode === 'tax_inclusive' && (
          <Typography sx={{ fontSize: 11 }} color="text.secondary">الأسعار تشمل الضريبة</Typography>
        )}
      </Stack>
      {data.paymentPlan?.mode === 'partial' && (
        <Box sx={{ mt: 1 }}>
          <Typography fontWeight={600}>تفاصيل التقسيط</Typography>
          <Stack direction="row" justifyContent="space-between" sx={{ fontSize: 12 }}>
            <Typography variant="caption">الدفعة المقدمة</Typography>
            <Typography variant="caption">{data.paymentPlan.downPayment.toFixed(2)}</Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between" sx={{ fontSize: 12 }}>
            <Typography variant="caption">المتبقي</Typography>
            <Typography variant="caption">{data.paymentPlan.remaining.toFixed(2)}</Typography>
          </Stack>
          {data.paymentPlan.expiresAt && (
            <Typography sx={{ fontSize: 12 }}>البضاعة محجوزة حتى {new Date(data.paymentPlan.expiresAt).toLocaleDateString()}</Typography>
          )}
          {data.paymentPlan.schedule && data.paymentPlan.schedule.length > 0 && (
            <Box sx={{ mt: 0.5, border: (t)=> `1px solid ${t.palette.divider}`, borderRadius: 1, p: 0.5, fontSize: 11 }}>
              {data.paymentPlan.schedule.map((s) => (
                <Stack key={s.seq} direction="row" justifyContent="space-between">
                  <Typography>#{s.seq}</Typography>
                  <Typography dir="ltr">{new Date(s.dueDate).toLocaleDateString()}</Typography>
                  <Typography>{s.amount.toFixed(2)}</Typography>
                </Stack>
              ))}
            </Box>
          )}
        </Box>
      )}
      {data.offlinePending && (
        <Typography color="warning.main" sx={{ mt: 1 }}>سيتم مزامنة الفاتورة عند توفر الاتصال</Typography>
      )}
      {tpl?.footer?.ar && <Typography align="center" sx={{ mt: 1 }}>{tpl.footer.ar}</Typography>}
    </Box>
  );
}

