"use client";
import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DataTable } from '@/components/mui/DataTable';
import { GridColDef } from '@mui/x-data-grid';
import type { LabelItem } from '@/lib/validators/labels';

export default function LabelsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [items, setItems] = useState<LabelItem[]>([]);
  const [template, setTemplate] = useState<'thermal-80'|'thermal-58'|'a4-3x8'>('thermal-80');
  const [barcodeType, setBarcodeType] = useState<'auto'|'code128'|'ean13'|'qr'>('auto');
  const [show, setShow] = useState({ name: true, sku: true, sizeColor: true, price: true, brand: false });
  const [shopName, setShopName] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success'|'info'|'warning'|'error' }>({ open: false, message: '', severity: 'success' });

  function addRow() {
    setItems((it) => [...it, { sku: '', name_ar: '', qty: 1 } as any]);
  }
  function updateItem(idx: number, patch: Partial<LabelItem>) {
    setItems((arr) => { const next = [...arr]; next[idx] = { ...next[idx], ...patch } as LabelItem; return next; });
  }
  async function genPreview() {
    setBusy(true);
    try {
      const res = await fetch('/api/labels/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ template, items, options: { barcodeType, show, shop: { name: shopName || undefined } } }) });
      if (!res.ok) { setSnack({ open: true, severity: 'error', message: 'خطأ في توليد PDF' }); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } finally { setBusy(false); }
  }
  async function downloadZpl() {
    const res = await fetch('/api/labels/zpl', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items, options: { barcodeType, show, shop: { name: shopName || undefined } } }) });
    if (!res.ok) { setSnack({ open: true, severity: 'error', message: 'خطأ في توليد ZPL' }); return; }
    const text = await res.text();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'labels.zpl';
    a.click();
  }

  const columns: GridColDef[] = useMemo(() => ([
    { field: 'sku', headerName: 'SKU', width: 150, renderCell: (p) => (
      <TextField size="small" value={(p.row.sku || '') as string} onChange={(e)=> updateItem(p.row.id, { sku: e.target.value })} />
    ) },
    { field: 'barcode', headerName: 'الباركود', width: 150, renderCell: (p) => (
      <TextField size="small" value={(p.row.barcode || '') as string} onChange={(e)=> updateItem(p.row.id, { barcode: e.target.value })} />
    ) },
    { field: 'name_ar', headerName: 'الاسم (ع)', width: 200, renderCell: (p) => (
      <TextField size="small" value={(p.row.name_ar || '') as string} onChange={(e)=> updateItem(p.row.id, { name_ar: e.target.value })} />
    ) },
    { field: 'size', headerName: 'المقاس', width: 100, renderCell: (p) => (
      <TextField size="small" value={(p.row.size || '') as string} onChange={(e)=> updateItem(p.row.id, { size: e.target.value })} />
    ) },
    { field: 'color', headerName: 'اللون', width: 100, renderCell: (p) => (
      <TextField size="small" value={(p.row.color || '') as string} onChange={(e)=> updateItem(p.row.id, { color: e.target.value })} />
    ) },
    { field: 'price', headerName: 'السعر', width: 120, renderCell: (p) => (
      <TextField size="small" type="number" value={p.row.price ?? ''} onChange={(e)=> updateItem(p.row.id, { price: e.target.value ? Number(e.target.value) : undefined })} />
    ) },
    { field: 'brand', headerName: 'العلامة', width: 140, renderCell: (p) => (
      <TextField size="small" value={(p.row.brand || '') as string} onChange={(e)=> updateItem(p.row.id, { brand: e.target.value })} />
    ) },
    { field: 'qty', headerName: 'الكمية', width: 100, renderCell: (p) => (
      <TextField size="small" type="number" value={p.row.qty} onChange={(e)=> updateItem(p.row.id, { qty: Number(e.target.value)||1 })} />
    ) },
  ]), []);

  const rows = useMemo(() => items.map((it, idx) => ({ id: idx, ...it })), [items]);

  return (
    <Box component="main" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }} dir="rtl">
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h6" fontWeight={600}>طباعة الملصقات</Typography>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'stretch', md: 'center' }}>
          <TextField select size="small" label="القالب" value={template} onChange={(e) => setTemplate(e.target.value as any)} sx={{ width: 220 }}>
            <MenuItem value="thermal-80">حراري 80مم</MenuItem>
            <MenuItem value="thermal-58">حراري 58مم</MenuItem>
            <MenuItem value="a4-3x8">A4 (3×8)</MenuItem>
          </TextField>
          <TextField select size="small" label="الباركود" value={barcodeType} onChange={(e) => setBarcodeType(e.target.value as any)} sx={{ width: 220 }}>
            <MenuItem value="auto">تلقائي</MenuItem>
            <MenuItem value="code128">Code128</MenuItem>
            <MenuItem value="ean13">EAN-13</MenuItem>
            <MenuItem value="qr">QR</MenuItem>
          </TextField>
          <TextField size="small" placeholder="اسم المتجر (اختياري)" value={shopName} onChange={(e)=> setShopName(e.target.value)} sx={{ flex: 1 }} />
        </Stack>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <FormControlLabel control={<Checkbox checked={show.name} onChange={(e)=> setShow({ ...show, name: e.target.checked })} />} label="الاسم" />
          <FormControlLabel control={<Checkbox checked={show.sku} onChange={(e)=> setShow({ ...show, sku: e.target.checked })} />} label="SKU" />
          <FormControlLabel control={<Checkbox checked={show.sizeColor} onChange={(e)=> setShow({ ...show, sizeColor: e.target.checked })} />} label="المقاس/اللون" />
          <FormControlLabel control={<Checkbox checked={show.price} onChange={(e)=> setShow({ ...show, price: e.target.checked })} />} label="السعر" />
          <FormControlLabel control={<Checkbox checked={show.brand} onChange={(e)=> setShow({ ...show, brand: e.target.checked })} />} label="العلامة" />
        </Stack>

        <Stack direction="row">
          <Button onClick={addRow} variant="outlined">إضافة سطر</Button>
        </Stack>

        <DataTable rows={rows} columns={columns} autoHeight />

        <Stack direction="row" spacing={1}>
          <Button disabled={busy || items.length===0} onClick={genPreview} variant="contained">معاينة PDF</Button>
          <Button disabled={items.length===0} onClick={downloadZpl} variant="contained" color="success">تنزيل ZPL</Button>
        </Stack>
      </Paper>

      {previewUrl && (
        <Paper variant="outlined" sx={{ height: '70vh', overflow: 'hidden' }}>
          <iframe src={previewUrl} style={{ width: '100%', height: '100%' }} />
        </Paper>
      )}

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ ...snack, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnack({ ...snack, open: false })} severity={snack.severity} variant="filled" sx={{ width: '100%' }}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
