"use client";
import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Checkbox, FormControlLabel, Grid, Paper, Snackbar, Alert, TextField, Typography } from '@mui/material';

type PaymentRules = {
  enabledMethods: Array<'cash'|'card'|'transfer'|'store_credit'|'cod'|'partial'>;
  partial?: { enabled: boolean; minUpfrontPct: number; maxDays: number; autoCancel: boolean };
  cashierManualDiscountLimitPct: number;
  drawer: { openOnCashSale: boolean; openOnRefund: boolean; allowNoSale: boolean; requireEndShiftCount: boolean };
  cash: { allowChange: boolean; roundingIncrement?: 0.05|0.10|null };
  card: { requireLast4?: boolean; requireRef?: boolean };
  transfer: { requireRef?: boolean };
};

export function PaymentsForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [online, setOnline] = useState(true);
  const [rules, setRules] = useState<PaymentRules>({
    enabledMethods: ['cash','card','transfer','store_credit'],
    partial: { enabled: false, minUpfrontPct: 10, maxDays: 30, autoCancel: false },
    cashierManualDiscountLimitPct: 10,
    drawer: { openOnCashSale: true, openOnRefund: true, allowNoSale: false, requireEndShiftCount: true },
    cash: { allowChange: true, roundingIncrement: null },
    card: { requireLast4: false, requireRef: false },
    transfer: { requireRef: true }
  });
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success'|'info'|'warning'|'error' }>({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/settings/payments');
        if (res.ok) {
          const data = await res.json();
          setRules({ ...rules, ...data });
        }
      } finally { setLoading(false); }
    })();
  }, []);

  const toggleMethod = (m: PaymentRules['enabledMethods'][number]) => {
    setRules((r) => ({ ...r, enabledMethods: r.enabledMethods.includes(m) ? r.enabledMethods.filter((x) => x !== m) : [...r.enabledMethods, m] }));
  };

  async function save() {
    if (!online) { setSnack({ open: true, message: 'يتطلب هذا الإجراء اتصالاً بالإنترنت.', severity: 'warning' }); return; }
    setSaving(true);
    try {
      const idk = Math.random().toString(36).slice(2);
      const res = await fetch('/api/settings/payments', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idk }, body: JSON.stringify(rules) });
      if (res.ok) {
        try { const { refreshSettingsConfig } = await import('@/lib/tax/cache'); await refreshSettingsConfig(); } catch {}
        setSnack({ open: true, message: 'تم الحفظ', severity: 'success' });
      } else {
        const e = await res.json();
        console.error(e);
        setSnack({ open: true, message: 'فشل الحفظ', severity: 'error' });
      }
    } finally { setSaving(false); }
  }

  if (loading) return <Box sx={{ p: 1 }}>...تحميل</Box>;

  const methodLabel: Record<string, string> = { cash: 'نقدًا', card: 'بطاقة', transfer: 'حوالة', store_credit: 'رصيد المتجر', cod: 'الدفع عند التسليم', partial: 'تقسيط' };

  return (
    <Box sx={{ p: 2 }}>
      <Typography fontWeight={600} sx={{ mb: 1 }}>طرق الدفع المسموحة</Typography>
      <Grid container spacing={1}>
        {(['cash','card','transfer','store_credit','cod','partial'] as const).map((m) => (
          <Grid item key={m}>
            <FormControlLabel control={<Checkbox checked={rules.enabledMethods.includes(m)} onChange={() => toggleMethod(m)} />} label={methodLabel[m]} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography fontWeight={600} sx={{ mb: 1 }}>سياسة التقسيط/الحجز</Typography>
            <FormControlLabel control={<Checkbox checked={!!rules.partial?.enabled} onChange={(e)=> setRules((r)=> ({ ...r, partial: { ...(r.partial||{}), enabled: e.target.checked, minUpfrontPct: r.partial?.minUpfrontPct ?? 10, maxDays: r.partial?.maxDays ?? 30, autoCancel: r.partial?.autoCancel ?? false } }))} />} label="تفعيل التقسيط" />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption">الدفعة الأدنى %</Typography>
                <TextField size="small" type="number" inputProps={{ dir: 'ltr' }} value={rules.partial?.minUpfrontPct ?? 10} onChange={(e)=> setRules((r)=> ({ ...r, partial: { ...(r.partial||{ enabled: false, minUpfrontPct: 10, maxDays: 30, autoCancel: false }), enabled: r.partial?.enabled ?? false, minUpfrontPct: Number(e.target.value) } }))} fullWidth />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption">المدة القصوى (أيام)</Typography>
                <TextField size="small" type="number" inputProps={{ dir: 'ltr' }} value={rules.partial?.maxDays ?? 30} onChange={(e)=> setRules((r)=> ({ ...r, partial: { ...(r.partial||{ enabled: false, minUpfrontPct: 10, maxDays: 30, autoCancel: false }), enabled: r.partial?.enabled ?? false, maxDays: Number(e.target.value) } }))} fullWidth />
              </Grid>
            </Grid>
            <FormControlLabel control={<Checkbox checked={!!rules.partial?.autoCancel} onChange={(e)=> setRules((r)=> ({ ...r, partial: { ...(r.partial||{ enabled: false, minUpfrontPct: 10, maxDays: 30, autoCancel: false }), enabled: r.partial?.enabled ?? false, autoCancel: e.target.checked } }))} />} label="إلغاء تلقائي بعد انتهاء المدة" />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography fontWeight={600} sx={{ mb: 1 }}>حد الخصم اليدوي للكاشير</Typography>
            <TextField size="small" type="number" inputProps={{ dir: 'ltr' }} value={rules.cashierManualDiscountLimitPct} onChange={(e)=> setRules((r)=> ({ ...r, cashierManualDiscountLimitPct: Number(e.target.value) }))} fullWidth />
            <Typography variant="caption" color="text.secondary">يتطلب تجاوز الحد موافقة المدير</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography fontWeight={600}>درج النقود</Typography>
            <FormControlLabel control={<Checkbox checked={rules.drawer.openOnCashSale} onChange={(e)=> setRules((r)=> ({ ...r, drawer: { ...r.drawer, openOnCashSale: e.target.checked } }))} />} label="فتح عند بيع نقدي" />
            <FormControlLabel control={<Checkbox checked={rules.drawer.openOnRefund} onChange={(e)=> setRules((r)=> ({ ...r, drawer: { ...r.drawer, openOnRefund: e.target.checked } }))} />} label="فتح عند استرداد" />
            <FormControlLabel control={<Checkbox checked={rules.drawer.allowNoSale} onChange={(e)=> setRules((r)=> ({ ...r, drawer: { ...r.drawer, allowNoSale: e.target.checked } }))} />} label="فتح بدون بيع (يتطلب إذن)" />
            <FormControlLabel control={<Checkbox checked={rules.drawer.requireEndShiftCount} onChange={(e)=> setRules((r)=> ({ ...r, drawer: { ...r.drawer, requireEndShiftCount: e.target.checked } }))} />} label="إلزام جرد نهاية الوردية" />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography fontWeight={600}>سياسة النقد</Typography>
            <FormControlLabel control={<Checkbox checked={rules.cash.allowChange} onChange={(e)=> setRules((r)=> ({ ...r, cash: { ...r.cash, allowChange: e.target.checked } }))} />} label="السماح بالباقي" />
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="caption">تقريب النقد</Typography>
                <TextField select size="small" fullWidth value={String(rules.cash.roundingIncrement ?? '')} onChange={(e)=> setRules((r)=> ({ ...r, cash: { ...r.cash, roundingIncrement: (e.target.value ? Number(e.target.value) : null) as any } }))} inputProps={{ dir: 'ltr' }}>
                  <MenuItem value="">—</MenuItem>
                  <MenuItem value="0.05">0.05</MenuItem>
                  <MenuItem value="0.1">0.10</MenuItem>
                </TextField>
              </Grid>
            </Grid>
            <Typography fontWeight={600} sx={{ mt: 2 }}>بطاقة/حوالة</Typography>
            <FormControlLabel control={<Checkbox checked={!!rules.card?.requireLast4} onChange={(e)=> setRules((r)=> ({ ...r, card: { ...(r.card||{}), requireLast4: e.target.checked } }))} />} label="طلب آخر 4 أرقام" />
            <FormControlLabel control={<Checkbox checked={!!rules.card?.requireRef} onChange={(e)=> setRules((r)=> ({ ...r, card: { ...(r.card||{}), requireRef: e.target.checked } }))} />} label="طلب مرجع العملية" />
            <FormControlLabel control={<Checkbox checked={!!rules.transfer?.requireRef} onChange={(e)=> setRules((r)=> ({ ...r, transfer: { ...(r.transfer||{}), requireRef: e.target.checked } }))} />} label="طلب مرجع الحوالة" />
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={1} alignItems="center" sx={{ mt: 2 }}>
        <Grid item>
          <Button variant="contained" onClick={save} disabled={!online || saving}>حفظ</Button>
        </Grid>
        {!online && (
          <Grid item>
            <Typography variant="caption" color="text.secondary">يتطلب هذا الإجراء اتصالاً بالإنترنت.</Typography>
          </Grid>
        )}
      </Grid>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
        <Alert severity={snack.severity} variant="filled" onClose={() => setSnack({ ...snack, open: false })}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

