"use client";
import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import { DataTable } from '@/components/mui/DataTable';
import { GridColDef } from '@mui/x-data-grid';

type Refund = {
  _id: string;
  origin: { type: 'return'|'exchange'|'sale_adjustment'|'manual'; refId?: string };
  customerId?: string;
  method: 'cash'|'card'|'transfer'|'store_credit';
  amount: number;
  status: 'pending'|'confirmed'|'failed';
  createdAt: number;
  notes?: string;
};

export default function RefundsPage() {
  const [list, setList] = useState<Refund[]>([]);
  const [method, setMethod] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [customerId, setCustomerId] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  async function load() {
    const params = new URLSearchParams();
    if (method) params.set('method', method);
    if (status) params.set('status', status);
    if (customerId) params.set('customerId', customerId);
    if (dateFrom) params.set('dateFrom', String(Date.parse(dateFrom)));
    if (dateTo) params.set('dateTo', String(Date.parse(dateTo)));
    const res = await fetch(`/api/refunds?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setList(data.results || []);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => list, [list]);

  const columns: GridColDef[] = useMemo(() => ([
    { field: 'createdAt', headerName: 'التاريخ', width: 200, valueFormatter: (p) => new Date(p.value as number).toLocaleString('ar-SA') },
    { field: 'customerId', headerName: 'العميل', width: 180, renderCell: (p) => <bdi dir="ltr">{(p.value as string) || '—'}</bdi> },
    { field: 'origin', headerName: 'الأصل', width: 220, valueGetter: (p) => `${p.row.origin?.type || ''}${p.row.origin?.refId ? ' / ' + String(p.row.origin.refId).slice(-6) : ''}` },
    { field: 'method', headerName: 'الطريقة', width: 160, valueFormatter: (p) => (p.value === 'store_credit' ? 'رصيد المتجر' : String(p.value)) },
    { field: 'amount', headerName: 'المبلغ', width: 140, valueFormatter: (p) => Number(p.value).toLocaleString('ar-SA') },
    { field: 'status', headerName: 'الحالة', width: 140, renderCell: (p) => (
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography component="span">{p.value as string}</Typography>
        {(p.value as string) === 'pending' && (
          <>
            <Button size="small" variant="contained" color="success" onClick={async ()=> { await fetch(`/api/refunds/${(p.row as Refund)._id}/confirm`, { method: 'POST' }); await load(); }}>تأكيد</Button>
            <Button size="small" variant="contained" color="error" onClick={async ()=> { await fetch(`/api/refunds/${(p.row as Refund)._id}/void`, { method: 'POST' }); await load(); }}>إبطال</Button>
          </>
        )}
      </Stack>
    ) },
    { field: 'notes', headerName: 'ملاحظات', flex: 1 },
  ]), []);

  return (
    <Box component="main" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }} dir="rtl">
      <Typography variant="h6" fontWeight={600}>سجل الاستردادات</Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'stretch', md: 'center' }}>
        <TextField size="small" select SelectProps={{ native: true }} value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="">الطريقة (الكل)</option>
          <option value="cash">نقدًا</option>
          <option value="card">بطاقة</option>
          <option value="transfer">حوالة</option>
          <option value="store_credit">رصيد متجر</option>
        </TextField>
        <TextField size="small" select SelectProps={{ native: true }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">الحالة (الكل)</option>
          <option value="pending">قيد الانتظار</option>
          <option value="confirmed">مؤكد</option>
          <option value="failed">فشل</option>
        </TextField>
        <TextField size="small" value={customerId} onChange={(e)=> setCustomerId(e.target.value)} placeholder="العميل (ID)" inputProps={{ dir: 'ltr' }} />
        <TextField size="small" type="date" value={dateFrom} onChange={(e)=> setDateFrom(e.target.value)} />
        <TextField size="small" type="date" value={dateTo} onChange={(e)=> setDateTo(e.target.value)} />
        <Button onClick={load} variant="contained">تصفية</Button>
      </Stack>

      <DataTable rows={filtered} columns={columns} getRowId={(r) => (r as Refund)._id} autoHeight />
    </Box>
  );
}


