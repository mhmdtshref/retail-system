"use client";
import { useEffect, useState } from 'react';
import { Box, Stack, Typography, Paper, Slider, Checkbox, FormControlLabel, Select, MenuItem, TextField } from '@mui/material';

export default function ObservabilitySettingsPage() {
  const [role, setRole] = useState<string>('viewer');
  const [loading, setLoading] = useState(true);
  const [samplingInfo, setSamplingInfo] = useState(10);
  const [clientLogsEnabled, setClientLogsEnabled] = useState(true);
  const [metricsPublic, setMetricsPublic] = useState(false);
  const [provider, setProvider] = useState<'none'|'sentry-webhook'|'console'>('console');
  const [webhookUrl, setWebhookUrl] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/self');
        if (res.ok) {
          const data = await res.json();
          setRole(data?.user?.role || 'viewer');
        }
        const s = await fetch('/api/settings/observability');
        if (s.ok) {
          const j = await s.json();
          setSamplingInfo(Math.round((j?.sampling?.info ?? 0.1) * 100));
          setClientLogsEnabled(!!j?.clientLogsEnabled);
          setMetricsPublic(!!j?.metrics?.exposePublic);
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  if (loading) return <Box component="main" sx={{ p: 2 }}>...تحميل</Box>;
  if (!(role === 'owner' || role === 'manager')) return <Box component="main" sx={{ p: 2 }}><Paper variant="outlined" sx={{ p: 2, color: 'error.main' }}>مرفوض: يتطلب صلاحيات مدير</Paper></Box>;

  return (
    <Box component="main" sx={{ p: 2 }} dir="rtl">
      <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>إعدادات المراقبة</Typography>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>معدل أخذ عينات سجلات المعلومات (%)</Typography>
            <Slider value={samplingInfo} onChange={async (_e, v) => {
              const val = Array.isArray(v) ? v[0] : v as number;
              setSamplingInfo(val);
              try { await fetch('/api/settings/observability', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sampling: { info: val/100 } }) }); } catch {}
            }} min={0} max={100} valueLabelDisplay="auto" />
          </Box>
          <FormControlLabel control={<Checkbox checked={clientLogsEnabled} onChange={async (e)=> { const c = e.target.checked; setClientLogsEnabled(c); try { await fetch('/api/settings/observability', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientLogsEnabled: c }) }); } catch {} }} />} label="تفعيل سجلات العميل (POS/المزامنة)" />
          <FormControlLabel control={<Checkbox checked={metricsPublic} onChange={async (e)=> { const c = e.target.checked; setMetricsPublic(c); try { await fetch('/api/settings/observability', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ metrics: { exposePublic: c } }) }); } catch {} }} />} label="فتح /api/_metrics بدون مصادقة" />
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>موفر الأخطاء</Typography>
            <Select size="small" value={provider} onChange={(e)=> setProvider(e.target.value as any)} sx={{ minWidth: 220 }}>
              <MenuItem value="none">بدون</MenuItem>
              <MenuItem value="console">Console</MenuItem>
              <MenuItem value="sentry-webhook">Sentry Webhook</MenuItem>
            </Select>
          </Box>
          {provider === 'sentry-webhook' && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>عنوان Webhook</Typography>
              <TextField size="small" fullWidth value={webhookUrl} onChange={(e)=> setWebhookUrl(e.target.value)} placeholder="https://..." inputProps={{ dir: 'ltr' }} />
            </Box>
          )}
          <Typography variant="caption" color="text.secondary">سيتم تطبيق الإعدادات على الفور (تجريبي: إعدادات وقت التشغيل).</Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
