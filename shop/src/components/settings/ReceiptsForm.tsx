"use client";
import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Grid, Paper, Snackbar, Alert, TextField, Typography, ToggleButton, ToggleButtonGroup, Stack } from '@mui/material';
import { ReceiptPreview } from './ReceiptPreview';

type ReceiptTemplate = {
  showLogo: boolean;
  showReceiptBarcode: boolean;
  showTaxSummary: boolean;
  showCashier: boolean;
  showCustomer: boolean;
  showReturnPolicy: boolean;
  showStoreCredit: boolean;
  labels: Record<string,string>;
  header: { ar?: string; en?: string };
  footer: { ar?: string; en?: string };
};

type ReceiptsConfig = {
  thermal80: ReceiptTemplate;
  a4: ReceiptTemplate;
};

export function ReceiptsForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [online, setOnline] = useState(true);
  const [template, setTemplate] = useState<'thermal80'|'a4'>('thermal80');
  const [conf, setConf] = useState<ReceiptsConfig>({
    thermal80: { showLogo: true, showReceiptBarcode: true, showTaxSummary: true, showCashier: true, showCustomer: true, showReturnPolicy: false, showStoreCredit: true, labels: {}, header: {}, footer: {} },
    a4: { showLogo: true, showReceiptBarcode: true, showTaxSummary: true, showCashier: true, showCustomer: true, showReturnPolicy: false, showStoreCredit: true, labels: {}, header: {}, footer: {} }
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
        const res = await fetch('/api/settings/receipts');
        if (res.ok) {
          const data = await res.json();
          setConf({ ...conf, ...data });
        }
      } finally { setLoading(false); }
    })();
  }, []);

  async function save() {
    if (!online) { setSnack({ open: true, message: 'يتطلب هذا الإجراء اتصالاً بالإنترنت.', severity: 'warning' }); return; }
    setSaving(true);
    try {
      const idk = Math.random().toString(36).slice(2);
      const csrf = document.cookie.split('; ').find(c=>c.startsWith('csrf-token='))?.split('=')[1] || '';
      const res = await fetch('/api/settings/receipts', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idk, 'X-CSRF-Token': csrf }, body: JSON.stringify(conf) });
      if (res.ok) {
        try { const { refreshSettingsConfig } = await import('@/lib/tax/cache'); await refreshSettingsConfig(); } catch {}
        setSnack({ open: true, message: 'تم الحفظ', severity: 'success' });
      } else {
        const e = await res.json(); console.error(e); setSnack({ open: true, message: 'فشل الحفظ', severity: 'error' });
      }
    } finally { setSaving(false); }
  }

  const mockReceipt = useMemo(() => ({
    localSaleId: 'local-1', createdAt: Date.now(),
    lines: [ { sku: 'SKU1', name: 'قميص', price: 50, qty: 1 } ],
    payments: [ { method: 'cash', amount: 50, seq: 1 } ],
    totals: { subtotal: 50, tax: 7.5, grand: 57.5, discountValue: 0, roundingAdj: 0 },
  } as any), []);

  if (loading) return <Box sx={{ p: 1 }}>...تحميل</Box>;

  const tpl = conf[template];

  const boolToggle = (key: keyof ReceiptTemplate, label: string) => (
    <FormRow>
      <FormControlLabel control={<Checkbox checked={!!(tpl as any)[key]} onChange={(e)=> setConf((c)=> ({ ...c, [template]: { ...(c as any)[template], [key]: e.target.checked } }))} />} label={label} />
    </FormRow>
  );

  function FormRow({ children }: { children: React.ReactNode }) { return <Box sx={{ mb: 1 }}>{children}</Box>; }

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography fontWeight={600} sx={{ mb: 1 }}>القالب</Typography>
          <ToggleButtonGroup size="small" value={template} exclusive onChange={(_, v) => v && setTemplate(v)}>
            <ToggleButton value="thermal80">حراري 80مم</ToggleButton>
            <ToggleButton value="a4">A4</ToggleButton>
          </ToggleButtonGroup>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography fontWeight={600} sx={{ mb: 1 }}>العناصر الظاهرة</Typography>
          <Grid container spacing={1}>
            <Grid item xs={6}>{boolToggle('showLogo','الشعار')}</Grid>
            <Grid item xs={6}>{boolToggle('showReceiptBarcode','باركود الإيصال')}</Grid>
            <Grid item xs={6}>{boolToggle('showTaxSummary','ملخص الضريبة')}</Grid>
            <Grid item xs={6}>{boolToggle('showCashier','إظهار الكاشير')}</Grid>
            <Grid item xs={6}>{boolToggle('showCustomer','إظهار العميل')}</Grid>
            <Grid item xs={6}>{boolToggle('showReturnPolicy','سياسة الإرجاع')}</Grid>
            <Grid item xs={6}>{boolToggle('showStoreCredit','رصيد المتجر')}</Grid>
          </Grid>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography fontWeight={600} sx={{ mb: 1 }}>الترويسة (ع/En)</Typography>
          <TextField fullWidth multiline minRows={3} value={tpl.header?.ar || ''} onChange={(e)=> setConf((c)=> ({ ...c, [template]: { ...(c as any)[template], header: { ...((c as any)[template]?.header||{}), ar: e.target.value } } }))} sx={{ mb: 1 }} />
          <TextField fullWidth multiline minRows={3} inputProps={{ dir: 'ltr' }} value={tpl.header?.en || ''} onChange={(e)=> setConf((c)=> ({ ...c, [template]: { ...(c as any)[template], header: { ...((c as any)[template]?.header||{}), en: e.target.value } } }))} />
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography fontWeight={600} sx={{ mb: 1 }}>التذييل (ع/En)</Typography>
          <TextField fullWidth multiline minRows={3} value={tpl.footer?.ar || ''} onChange={(e)=> setConf((c)=> ({ ...c, [template]: { ...(c as any)[template], footer: { ...((c as any)[template]?.footer||{}), ar: e.target.value } } }))} sx={{ mb: 1 }} />
          <TextField fullWidth multiline minRows={3} inputProps={{ dir: 'ltr' }} value={tpl.footer?.en || ''} onChange={(e)=> setConf((c)=> ({ ...c, [template]: { ...(c as any)[template], footer: { ...((c as any)[template]?.footer||{}), en: e.target.value } } }))} />
        </Paper>

        <Stack direction="row" spacing={1} alignItems="center">
          <Button variant="contained" onClick={save} disabled={!online || saving}>حفظ</Button>
          {!online && <Typography variant="caption" color="text.secondary">يتطلب هذا الإجراء اتصالاً بالإنترنت.</Typography>}
        </Stack>
      </Grid>

      <Grid item xs={12} md={6}>
        <Typography fontWeight={600} sx={{ mb: 1 }}>المعاينة</Typography>
        <ReceiptPreview data={mockReceipt} template={template} />
      </Grid>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
        <Alert severity={snack.severity} variant="filled" onClose={() => setSnack({ ...snack, open: false })}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Grid>
  );
}

