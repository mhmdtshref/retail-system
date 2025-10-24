"use client";
import { useEffect, useState } from 'react';
import { Box, Button, Checkbox, FormControlLabel, Grid, MenuItem, Paper, Select, Stack, TextField, Typography } from '@mui/material';

type Chan = 'email'|'sms'|'whatsapp';

export default function NotificationsSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>({ channels: { email: true, sms: false, whatsapp: false }, throttling: { hoursPerEvent: 24 } });
  const [test, setTest] = useState<{ channel: Chan; to: any; key: string; lang: 'ar'|'en' }>({ channel: 'email', to: {}, key: 'ORDER_CREATED', lang: 'ar' });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/notifications/settings');
        const data = await res.json();
        setSettings({ channels: { email: true, sms: false, whatsapp: false }, throttling: { hoursPerEvent: 24 }, ...(data?.settings || {}) });
      } catch {}
      setLoading(false);
    })();
  }, []);

  async function save() {
    setSaving(true);
    try {
      await fetch('/api/notifications/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
    } finally { setSaving(false); }
  }

  async function testSend() {
    const body: any = { channel: test.channel, to: test.to, key: test.key, lang: test.lang };
    await fetch('/api/notifications/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  }

  if (loading) return <Box component="main" sx={{ p: 2 }}>...تحميل</Box>;
  return (
    <Box component="main" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6" fontWeight={600}>الإشعارات</Typography>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography fontWeight={600} sx={{ mb: 1 }}>القنوات</Typography>
        <Stack direction="row" spacing={2}>
          {(['email','sms','whatsapp'] as Chan[]).map(ch => (
            <FormControlLabel key={ch} control={<Checkbox checked={!!settings.channels?.[ch]} onChange={(e)=> setSettings((s:any)=> ({ ...s, channels: { ...s.channels, [ch]: e.target.checked } }))} />} label={ch} />
          ))}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography fontWeight={600} sx={{ mb: 1 }}>حد الإرسال</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField size="small" type="number" sx={{ width: 120 }} inputProps={{ min: 1, max: 168 }} value={settings.throttling?.hoursPerEvent ?? 24} onChange={(e)=> setSettings((s:any)=> ({ ...s, throttling: { hoursPerEvent: Number(e.target.value || 24) } }))} />
          <Typography variant="caption" color="text.secondary">ساعات لكل حدث</Typography>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography fontWeight={600} sx={{ mb: 1 }}>إعدادات المزود</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography fontWeight={600}>البريد</Typography>
              <TextField size="small" fullWidth sx={{ mt: 1 }} placeholder="From Name" value={settings.email?.fromName || ''} onChange={(e)=> setSettings((s:any)=> ({ ...s, email: { ...(s.email||{}), fromName: e.target.value } }))} />
              <TextField size="small" fullWidth sx={{ mt: 1 }} placeholder="From Address" value={settings.email?.fromAddress || ''} onChange={(e)=> setSettings((s:any)=> ({ ...s, email: { ...(s.email||{}), fromAddress: e.target.value } }))} />
              <TextField size="small" fullWidth sx={{ mt: 1 }} placeholder="Relay Webhook URL" value={settings.email?.relayWebhookUrl || ''} onChange={(e)=> setSettings((s:any)=> ({ ...s, email: { ...(s.email||{}), relayWebhookUrl: e.target.value } }))} />
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography fontWeight={600}>SMS</Typography>
              <TextField size="small" fullWidth sx={{ mt: 1 }} placeholder="Sender ID" value={settings.sms?.senderId || ''} onChange={(e)=> setSettings((s:any)=> ({ ...s, sms: { ...(s.sms||{}), senderId: e.target.value } }))} />
              <TextField size="small" fullWidth sx={{ mt: 1 }} placeholder="Relay Webhook URL" value={settings.sms?.relayWebhookUrl || ''} onChange={(e)=> setSettings((s:any)=> ({ ...s, sms: { ...(s.sms||{}), relayWebhookUrl: e.target.value } }))} />
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography fontWeight={600}>واتساب</Typography>
              <TextField size="small" fullWidth sx={{ mt: 1 }} placeholder="WA Number (whatsapp:+9665...)" value={settings.whatsapp?.waNumber || ''} onChange={(e)=> setSettings((s:any)=> ({ ...s, whatsapp: { ...(s.whatsapp||{}), waNumber: e.target.value } }))} />
              <TextField size="small" fullWidth sx={{ mt: 1 }} placeholder="Relay Webhook URL" value={settings.whatsapp?.relayWebhookUrl || ''} onChange={(e)=> setSettings((s:any)=> ({ ...s, whatsapp: { ...(s.whatsapp||{}), relayWebhookUrl: e.target.value } }))} />
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      <Stack direction="row" spacing={1}>
        <Button variant="contained" onClick={save} disabled={saving}>حفظ</Button>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography fontWeight={600} sx={{ mb: 1 }}>اختبار الإرسال</Typography>
        <Grid container spacing={1} alignItems="center">
          <Grid item xs={12} md={3}>
            <Select size="small" fullWidth value={test.channel} onChange={(e)=> setTest(t => ({ ...t, channel: e.target.value as Chan }))}>
              <MenuItem value="email">Email</MenuItem>
              <MenuItem value="sms">SMS</MenuItem>
              <MenuItem value="whatsapp">WhatsApp</MenuItem>
            </Select>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField size="small" fullWidth placeholder="To (email/phone/wa)" onChange={(e)=> setTest(t => ({ ...t, to: t.channel==='email'?{ email: e.target.value }: t.channel==='sms'?{ phone: e.target.value }:{ wa: e.target.value }))} />
          </Grid>
          <Grid item xs={12} md={3}>
            <Select size="small" fullWidth value={test.key} onChange={(e)=> setTest(t => ({ ...t, key: e.target.value as any }))}>
              {['ORDER_CREATED','ORDER_PAID','SHIPMENT_CREATED','OUT_FOR_DELIVERY','DELIVERED','COD_REMINDER','LAYAWAY_CREATED','LAYAWAY_PAYMENT_POSTED','LAYAWAY_DUE_SOON','LAYAWAY_OVERDUE','LAYAWAY_FORFEITED'].map(k => <MenuItem key={k} value={k}>{k}</MenuItem>)}
            </Select>
          </Grid>
          <Grid item xs={12} md={2}>
            <Select size="small" fullWidth value={test.lang} onChange={(e)=> setTest(t => ({ ...t, lang: e.target.value as any }))}>
              <MenuItem value="ar">AR</MenuItem>
              <MenuItem value="en">EN</MenuItem>
            </Select>
          </Grid>
          <Grid item xs={12} md={1}>
            <Button variant="outlined" onClick={testSend} fullWidth>إرسال</Button>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}
