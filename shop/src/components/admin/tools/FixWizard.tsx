"use client";
import { useEffect, useState } from 'react';
import { Box, Button, Checkbox, FormControlLabel, MenuItem, Select, Stack, Typography } from '@mui/material';

export default function FixWizard() {
  const [kind, setKind] = useState<'order_totals'|'stock_reserved'|'layaway_balance'|'orphan_payments'|'transfer_state'|'customer_merge'>('order_totals');
  const [dry, setDry] = useState(true);
  const [report, setReport] = useState<any | null>(null);
  const [running, setRunning] = useState(false);

  async function run() {
    setRunning(true);
    try {
      const res = await fetch('/api/admin/tools/fixes/run', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `${kind}:${Date.now()}` }, body: JSON.stringify({ kind, params: {}, dryRun: dry }) });
      const data = await res.json();
      setReport(data);
    } finally { setRunning(false); }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Select size="small" value={kind} onChange={(e)=> setKind(e.target.value as any)}>
          <MenuItem value="order_totals">إعادة حساب إجمالي الطلب</MenuItem>
          <MenuItem value="stock_reserved">إعادة احتساب المحجوز</MenuItem>
          <MenuItem value="layaway_balance">إعادة احتساب رصيد التقسيط</MenuItem>
          <MenuItem value="orphan_payments">مدفوعات يتيمة</MenuItem>
          <MenuItem value="transfer_state">إصلاح حالات التحويل</MenuItem>
          <MenuItem value="customer_merge">دمج العملاء (مُرشد)</MenuItem>
        </Select>
        <FormControlLabel control={<Checkbox checked={dry} onChange={(e)=> setDry(e.target.checked)} />} label="تشغيل جاف" />
        <Button disabled={running} onClick={run} variant="contained">تشغيل</Button>
      </Stack>
      {report && (
        <Box component="pre" sx={{ p: 1, bgcolor: 'background.default', borderRadius: 1, border: (t)=> `1px solid ${t.palette.divider}`, overflow: 'auto', fontSize: 12 }} dir="ltr">{JSON.stringify(report, null, 2)}</Box>
      )}
    </Box>
  );
}
