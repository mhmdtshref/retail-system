"use client";
import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, FormControlLabel, Grid, MenuItem, Paper, Radio, RadioGroup, Select, Snackbar, Stack, TextField, Typography } from '@mui/material';

export default function TaxSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cfg, setCfg] = useState<any>(null);
  const [curr, setCurr] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const [tres, cres] = await Promise.all([
          fetch('/api/settings/tax'),
          fetch('/api/settings/currency')
        ]);
        if (tres.ok) setCfg(await tres.json());
        if (cres.ok) setCurr(await cres.json());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const preview = useMemo(() => {
    try {
      const nf = new Intl.NumberFormat(curr?.displayLocale || 'ar-SA', { style: 'currency', currency: curr?.defaultCurrency || 'SAR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return nf.format(1234.56);
    } catch { return '١٬٢٣٤٫٥٦ ر.س'; }
  }, [curr]);

  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success'|'info'|'warning'|'error' }>({ open: false, message: '', severity: 'info' });

  async function save() {
    setSaving(true);
    try {
      await fetch('/api/settings/tax', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `tax:${Date.now()}` }, body: JSON.stringify(cfg) });
      await fetch('/api/settings/currency', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `cur:${Date.now()}` }, body: JSON.stringify(curr) });
      setSnack({ open: true, message: 'تم الحفظ', severity: 'success' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Box sx={{ p: 2 }}>...</Box>;

  return (
    <Box component="main" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }} dir="rtl">
      <Typography variant="h6" fontWeight={600}>الضرائب والعملات</Typography>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography fontWeight={600} sx={{ mb: 1 }}>وضع الأسعار</Typography>
        <RadioGroup row value={cfg?.priceMode || ''} onChange={(_, v)=> setCfg((c:any)=> ({ ...c, priceMode: v }))}>
          <FormControlLabel value="tax_inclusive" control={<Radio />} label="شامل الضريبة" />
          <FormControlLabel value="tax_exclusive" control={<Radio />} label="غير شامل الضريبة" />
        </RadioGroup>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <Typography variant="caption">النسبة الافتراضية (%)</Typography>
            <TextField size="small" type="number" inputProps={{ dir: 'ltr' }} fullWidth value={(cfg?.defaultRate||0)*100} onChange={(e)=> setCfg((c:any)=> ({ ...c, defaultRate: Math.max(0, Number(e.target.value))/100 }))} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="caption">الدقة (خانات عشرية)</Typography>
            <TextField size="small" type="number" inputProps={{ dir: 'ltr' }} fullWidth value={cfg?.precision||2} onChange={(e)=> setCfg((c:any)=> ({ ...c, precision: Math.max(0, Number(e.target.value)) }))} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="caption">تقريب السطر/الفاتورة</Typography>
            <Select size="small" fullWidth value={cfg?.receiptRounding||'none'} onChange={(e)=> setCfg((c:any)=> ({ ...c, receiptRounding: e.target.value }))}>
              <MenuItem value="none">تقريب على مستوى السطر</MenuItem>
              <MenuItem value="half_up">تقريب الفاتورة (Half-up)</MenuItem>
              <MenuItem value="bankers">تقريب الفاتورة (Bankers)</MenuItem>
            </Select>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="caption">طريقة التقريب</Typography>
            <Select size="small" fullWidth value={cfg?.roundingStrategy||'half_up'} onChange={(e)=> setCfg((c:any)=> ({ ...c, roundingStrategy: e.target.value }))}>
              <MenuItem value="half_up">Half-up</MenuItem>
              <MenuItem value="bankers">Bankers</MenuItem>
            </Select>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="caption">تقريب النقد</Typography>
            <Select size="small" fullWidth value={String(cfg?.cashRounding?.increment ?? 0.05)} onChange={(e)=> setCfg((c:any)=> ({ ...c, cashRounding: { enabled: true, increment: Number(e.target.value) } }))}>
              <MenuItem value="0.05">0.05</MenuItem>
              <MenuItem value="0.1">0.10</MenuItem>
            </Select>
          </Grid>
        </Grid>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography fontWeight={600} sx={{ mb: 1 }}>العملة</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="caption">العملة الافتراضية</Typography>
            <TextField size="small" fullWidth value={curr?.defaultCurrency || 'SAR'} onChange={(e)=> setCurr((c:any)=> ({ ...c, defaultCurrency: e.target.value }))} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="caption">اللغة/المنطقة للعرض</Typography>
            <TextField size="small" fullWidth value={curr?.displayLocale || 'ar-SA'} onChange={(e)=> setCurr((c:any)=> ({ ...c, displayLocale: e.target.value }))} />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption">معاينة: <Box component="span" dir="ltr">{preview}</Box></Typography>
          </Grid>
        </Grid>
      </Paper>

      <Stack direction="row" spacing={1}>
        <Button disabled={saving} onClick={save} variant="contained">حفظ</Button>
      </Stack>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={()=> setSnack((s)=> ({ ...s, open: false }))}>
        <Alert severity={snack.severity} onClose={()=> setSnack((s)=> ({ ...s, open: false }))}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
