"use client";
import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Checkbox, FormControlLabel, Grid, Paper, Snackbar, Alert, TextField, Typography, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { Stack } from '@mui/material';

type LocalesConfig = {
  defaultLang: 'ar'|'en';
  rtlByLang: { ar: boolean; en: boolean };
  currency: string;
  displayLocale: string;
  dateFormat: string;
  timeFormat: '12h'|'24h';
  shopInfo: { name_ar: string; name_en?: string; phone?: string; taxNumber?: string; address_ar?: string; address_en?: string };
};

export function LocalesForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [online, setOnline] = useState(true);
  const [conf, setConf] = useState<LocalesConfig>({ defaultLang: 'ar', rtlByLang: { ar: true, en: false }, currency: 'SAR', displayLocale: 'ar-SA', dateFormat: 'dd/MM/yyyy', timeFormat: '12h', shopInfo: { name_ar: '' } });
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
        const res = await fetch('/api/settings/locales');
        if (res.ok) {
          const data = await res.json();
          setConf({ ...conf, ...data });
        }
      } finally { setLoading(false); }
    })();
  }, []);

  const numberPreview = useMemo(() => {
    try { return new Intl.NumberFormat(conf.displayLocale, { style: 'currency', currency: conf.currency || 'SAR' }).format(12345.67); } catch { return '12345.67'; }
  }, [conf.displayLocale, conf.currency]);

  const datePreview = useMemo(() => {
    try { return new Intl.DateTimeFormat(conf.displayLocale, { dateStyle: 'medium', timeStyle: conf.timeFormat === '12h' ? 'short' : 'medium', hour12: conf.timeFormat === '12h' }).format(new Date('2025-03-15T13:45:00Z')); } catch { return '15/03/2025 1:45 PM'; }
  }, [conf.displayLocale, conf.timeFormat]);

  async function save() {
    if (!online) { setSnack({ open: true, message: 'يتطلب هذا الإجراء اتصالاً بالإنترنت.', severity: 'warning' }); return; }
    setSaving(true);
    try {
      const idk = Math.random().toString(36).slice(2);
      const res = await fetch('/api/settings/locales', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idk }, body: JSON.stringify(conf) });
      if (res.ok) {
        // refresh cached settings
        try { const { refreshSettingsConfig } = await import('@/lib/tax/cache'); await refreshSettingsConfig(); } catch {}
        setSnack({ open: true, message: 'تم الحفظ', severity: 'success' });
      } else {
        const e = await res.json(); console.error(e); setSnack({ open: true, message: 'فشل الحفظ', severity: 'error' });
      }
    } finally { setSaving(false); }
  }

  if (loading) return <Box sx={{ p: 1 }}>...تحميل</Box>;

  return (
    <Box sx={{ p: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography fontWeight={600} sx={{ mb: 1 }}>اللغة والاتجاه</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption">اللغة الافتراضية</Typography>
                <TextField select size="small" fullWidth value={conf.defaultLang} onChange={(e)=> setConf((c)=> ({ ...c, defaultLang: e.target.value as any }))}>
                  <option value="ar">العربية</option>
                  <option value="en">English</option>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption">المحلية (Intl)</Typography>
                <TextField size="small" fullWidth value={conf.displayLocale} onChange={(e)=> setConf((c)=> ({ ...c, displayLocale: e.target.value }))} inputProps={{ dir: 'ltr' }} placeholder="ar-SA" />
              </Grid>
            </Grid>
            <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
              <FormControlLabel control={<Checkbox checked={conf.rtlByLang.ar} onChange={(e)=> setConf((c)=> ({ ...c, rtlByLang: { ...c.rtlByLang, ar: e.target.checked } }))} />} label="RTL للعربية" />
              <FormControlLabel control={<Checkbox checked={conf.rtlByLang.en} onChange={(e)=> setConf((c)=> ({ ...c, rtlByLang: { ...c.rtlByLang, en: e.target.checked } }))} />} label="RTL للإنجليزية" />
            </Stack>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={6}>
                <Typography variant="caption">تنسيق التاريخ</Typography>
                <TextField size="small" fullWidth value={conf.dateFormat} onChange={(e)=> setConf((c)=> ({ ...c, dateFormat: e.target.value }))} placeholder="dd/MM/yyyy" />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption">الوقت</Typography>
                <TextField select size="small" fullWidth value={conf.timeFormat} onChange={(e)=> setConf((c)=> ({ ...c, timeFormat: e.target.value as any }))}>
                  <option value="12h">12 ساعة</option>
                  <option value="24h">24 ساعة</option>
                </TextField>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography fontWeight={600} sx={{ mb: 1 }}>العملة والتنسيق</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption">رمز العملة</Typography>
                <TextField size="small" fullWidth value={conf.currency} onChange={(e)=> setConf((c)=> ({ ...c, currency: e.target.value.toUpperCase() }))} inputProps={{ dir: 'ltr' }} placeholder="SAR" />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption">معاينة</Typography>
                <Paper variant="outlined" sx={{ px: 1, py: 0.5 }}><Box component="span" dir="ltr">{numberPreview}</Box></Paper>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption">تاريخ/وقت (Intl)</Typography>
                <Paper variant="outlined" sx={{ px: 1, py: 0.5 }}><Box component="span" dir="ltr">{datePreview}</Box></Paper>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography fontWeight={600} sx={{ mb: 1 }}>معلومات المتجر</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="caption">اسم المتجر (ع)</Typography>
                <TextField size="small" fullWidth value={conf.shopInfo.name_ar} onChange={(e)=> setConf((c)=> ({ ...c, shopInfo: { ...c.shopInfo, name_ar: e.target.value } }))} />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="caption">اسم المتجر (E)</Typography>
                <TextField size="small" fullWidth value={conf.shopInfo.name_en || ''} onChange={(e)=> setConf((c)=> ({ ...c, shopInfo: { ...c.shopInfo, name_en: e.target.value } }))} inputProps={{ dir: 'ltr' }} />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="caption">الهاتف</Typography>
                <TextField size="small" fullWidth value={conf.shopInfo.phone || ''} onChange={(e)=> setConf((c)=> ({ ...c, shopInfo: { ...c.shopInfo, phone: e.target.value } }))} inputProps={{ dir: 'ltr' }} />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="caption">الرقم الضريبي</Typography>
                <TextField size="small" fullWidth value={conf.shopInfo.taxNumber || ''} onChange={(e)=> setConf((c)=> ({ ...c, shopInfo: { ...c.shopInfo, taxNumber: e.target.value } }))} inputProps={{ dir: 'ltr' }} />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="caption">العنوان (ع)</Typography>
                <TextField size="small" fullWidth value={conf.shopInfo.address_ar || ''} onChange={(e)=> setConf((c)=> ({ ...c, shopInfo: { ...c.shopInfo, address_ar: e.target.value } }))} />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="caption">العنوان (E)</Typography>
                <TextField size="small" fullWidth value={conf.shopInfo.address_en || ''} onChange={(e)=> setConf((c)=> ({ ...c, shopInfo: { ...c.shopInfo, address_en: e.target.value } }))} inputProps={{ dir: 'ltr' }} />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button variant="contained" onClick={save} disabled={!online || saving}>حفظ</Button>
            {!online && <Typography variant="caption" color="text.secondary">يتطلب هذا الإجراء اتصالاً بالإنترنت.</Typography>}
          </Stack>
        </Grid>
      </Grid>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
        <Alert severity={snack.severity} variant="filled" onClose={() => setSnack({ ...snack, open: false })}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

