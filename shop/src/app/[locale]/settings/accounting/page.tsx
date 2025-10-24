"use client";
import { useEffect, useState } from 'react';
import { Box, Button, Grid, MenuItem, Paper, Select, Stack, TextField, Typography } from '@mui/material';

type Accounts = {
  sales: string; returns: string; discounts: string; taxPayable: string; rounding: string; cogs: string; inventory: string;
  cash: string; cardClearing: string; transfer: string; codClearing: string; storeCreditLiability: string; storeCreditExpense?: string;
  ar?: string; layawayAr?: string; inventoryGainLoss?: string;
};

export default function AccountingSettingsPage() {
  const [role, setRole] = useState<string>('viewer');
  const [data, setData] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/self');
        if (res.ok) {
          const j = await res.json();
          setRole(j?.user?.role || 'viewer');
        }
      } catch {}
      try {
        const res = await fetch('/api/accounting/settings');
        if (res.ok) setData(await res.json());
      } catch {}
    })();
  }, []);

  const canEdit = role === 'owner' || role === 'manager';

  async function save() {
    if (!canEdit) return;
    setSaving(true);
    try {
      const res = await fetch('/api/accounting/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (res.ok) setData(await res.json());
    } catch {}
    setSaving(false);
  }

  if (!data) return <Box component="main" sx={{ p: 2 }}>...تحميل</Box>;
  if (!canEdit) return <Box component="main" sx={{ p: 2 }}><Paper variant="outlined" sx={{ p: 2, color: 'error.main' }}>مرفوض: يتطلب صلاحيات مدير</Paper></Box>;

  function setAcc<K extends keyof Accounts>(k: K, v: string) {
    setData((d: any) => ({ ...d, accounts: { ...d.accounts, [k]: v } }));
  }

  return (
    <Box component="main" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6" fontWeight={600}>إعدادات المحاسبة</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography sx={{ width: 120 }}>الموفر</Typography>
                <Select size="small" value={data.provider} onChange={(e)=> setData({ ...data, provider: e.target.value })}>
                  <MenuItem value="generic_csv">Generic CSV</MenuItem>
                  <MenuItem value="quickbooks_csv">QuickBooks CSV</MenuItem>
                  <MenuItem value="xero_csv">Xero CSV</MenuItem>
                </Select>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography sx={{ width: 120 }}>منطقة زمنية</Typography>
                <TextField size="small" value={data.tz} onChange={(e)=> setData({ ...data, tz: e.target.value })} fullWidth />
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography sx={{ width: 120 }}>عملة الأساس</Typography>
                <TextField size="small" value={data.baseCurrency} onChange={(e)=> setData({ ...data, baseCurrency: e.target.value })} fullWidth />
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography sx={{ width: 120 }}>المستوى</Typography>
                <Select size="small" value={data.consolidation} onChange={(e)=> setData({ ...data, consolidation: e.target.value })}>
                  <MenuItem value="daily_summary">تجميع يومي</MenuItem>
                  <MenuItem value="per_receipt">لكل إيصال</MenuItem>
                </Select>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography sx={{ width: 120 }}>تاريخ الأساس</Typography>
                <Select size="small" value={data.dateBasis} onChange={(e)=> setData({ ...data, dateBasis: e.target.value })}>
                  <MenuItem value="order_date">تاريخ الطلب</MenuItem>
                  <MenuItem value="payment_date">تاريخ الدفع</MenuItem>
                </Select>
              </Stack>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography fontWeight={600} sx={{ mb: 1 }}>ربط الحسابات</Typography>
            <Stack spacing={1}>
              {Object.entries(data.accounts || {}).map(([k,v]: any) => (
                <Stack key={k} direction="row" spacing={1} alignItems="center">
                  <Typography sx={{ width: 200 }}>{k}</Typography>
                  <TextField size="small" value={v || ''} onChange={(e)=> setAcc(k as any, e.target.value)} fullWidth />
                </Stack>
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
      <Stack direction="row" spacing={1}>
        <Button onClick={save} disabled={saving} variant="contained">حفظ</Button>
        <Button component="a" href="/api/accounting/sample/quickbooks_csv" target="_blank" rel="noopener noreferrer" variant="outlined">تنزيل مثال QBO</Button>
        <Button component="a" href="/api/accounting/sample/xero_csv" target="_blank" rel="noopener noreferrer" variant="outlined">تنزيل مثال Xero</Button>
      </Stack>
    </Box>
  );
}

