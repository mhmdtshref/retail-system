"use client";
import { use, useEffect, useMemo, useState, ChangeEvent } from 'react';
import Link from 'next/link';
import {
  Alert,
  Box,
  Button,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { DataTable } from '@/components/mui/DataTable';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';

type ParsedLine = { code?: string; name?: string; size?: string; color?: string; quantity?: number; unitCost?: number; total?: number; raw?: string };
type ReviewRow = { sku?: string; size?: string; color?: string; quantity: number; unitCost: number; _idx: number; id: number };
type LineRow = { sku: string; size?: string; color?: string; quantityOrdered?: number; quantityReceived?: number; unitCost?: number };

export default function POPage({ params }: { params: Promise<{ id: string }> }) {
  const [po, setPo] = useState<any | null>(null);
  const [tab, setTab] = useState<'attachments'|'ocr'|'lines'>('attachments');
  const [review, setReview] = useState<ReviewRow[]>([]);
  const [rawText, setRawText] = useState('');
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success'|'info'|'warning'|'error' }>({ open: false, message: '', severity: 'success' });
  const { id } = use(params);

  async function load() {
    const res = await fetch(`/api/purchase-orders/${id}`, { cache: 'no-store' });
    const data = await res.json();
    if (res.ok) setPo(data.purchaseOrder);
  }
  useEffect(() => { load(); }, [id]);

  function statusLabel(s: string) { return s==='draft'?'مسودة': s==='partial'?'تم الاستلام جزئيًا': s==='received'?'تم الاستلام':'ملغي'; }

  async function onUpload(file: File) {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`/api/purchase-orders/${id}/upload`, { method: 'POST', body: form });
    const data = await res.json();
    if (res.ok) {
      setRawText(data.rawText || '');
      if (Array.isArray(data.parsed)) {
        const mapped: ReviewRow[] = (data.parsed as ParsedLine[]).map((l, i) => ({ sku: l.code, size: l.size, color: l.color, quantity: l.quantity || 0, unitCost: l.unitCost || 0, _idx: i, id: i }));
        setReview(mapped);
      }
      await load();
    }
  }

  async function onParse() {
    const res = await fetch(`/api/purchase-orders/${id}/ocr/parse`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rawText }) });
    const data = await res.json();
    if (res.ok) {
      const mapped: ReviewRow[] = (data.parsed as ParsedLine[]).map((l, i) => ({ sku: l.code, size: l.size, color: l.color, quantity: l.quantity || 0, unitCost: l.unitCost || 0, _idx: i, id: i }));
      setReview(mapped);
    }
  }

  async function onReceive() {
    const lines = review.filter((l) => l.sku && l.quantity > 0);
    const res = await fetch(`/api/purchase-orders/${id}/receive`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lines }) });
    if (res.ok) {
      setSnack({ open: true, message: 'تم الاستلام بنجاح', severity: 'success' });
      await load();
    }
  }

  const attachments = useMemo(() => po?.attachments || [], [po]);

  const ocrColumns: GridColDef<ReviewRow>[] = useMemo(() => ([
    { field: 'sku', headerName: 'الكود/الرمز', width: 160, renderCell: (p: GridRenderCellParams<ReviewRow>) => (
      <TextField size="small" value={(p.row.sku || '') as string} onChange={(e) => {
        const next = [...review];
        next[p.row._idx].sku = e.target.value;
        setReview(next);
      }} />
    ) },
    { field: 'name', headerName: 'الاسم', width: 120, sortable: false, renderCell: () => (
      <Typography color="text.secondary">—</Typography>
    ) },
    { field: 'size', headerName: 'المقاس', width: 120, renderCell: (p: GridRenderCellParams<ReviewRow>) => (
      <TextField size="small" value={(p.row.size || '') as string} onChange={(e) => {
        const next = [...review];
        next[p.row._idx].size = e.target.value;
        setReview(next);
      }} />
    ) },
    { field: 'color', headerName: 'اللون', width: 120, renderCell: (p: GridRenderCellParams<ReviewRow>) => (
      <TextField size="small" value={(p.row.color || '') as string} onChange={(e) => {
        const next = [...review];
        next[p.row._idx].color = e.target.value;
        setReview(next);
      }} />
    ) },
    { field: 'quantity', headerName: 'الكمية', width: 120, renderCell: (p: GridRenderCellParams<ReviewRow>) => (
      <TextField size="small" type="number" value={Number(p.row.quantity)} onChange={(e) => {
        const next = [...review];
        next[p.row._idx].quantity = Number(e.target.value);
        setReview(next);
      }} />
    ) },
    { field: 'unitCost', headerName: 'سعر الوحدة', width: 140, renderCell: (p: GridRenderCellParams<ReviewRow>) => (
      <TextField size="small" type="number" value={Number(p.row.unitCost)} onChange={(e) => {
        const next = [...review];
        next[p.row._idx].unitCost = Number(e.target.value);
        setReview(next);
      }} />
    ) },
    { field: 'total', headerName: 'الإجمالي', width: 140, valueGetter: (_value, row) => (row.quantity * row.unitCost) || 0, valueFormatter: (value) => (Number(value as any) || 0).toFixed(2) },
  ]), [review]);

  const ocrRows = useMemo<ReviewRow[]>(() => review.map((r, idx) => ({ ...r, _idx: idx, id: idx })), [review]);

  const lineColumns: GridColDef<LineRow>[] = useMemo(() => ([
    { field: 'sku', headerName: 'الكود', width: 160 },
    { field: 'size', headerName: 'المقاس', width: 120 },
    { field: 'color', headerName: 'اللون', width: 120 },
    { field: 'quantityOrdered', headerName: 'الكمية المطلوبة', width: 160 },
    { field: 'quantityReceived', headerName: 'المستلمة', width: 140 },
    { field: 'unitCost', headerName: 'سعر الوحدة', width: 140, valueFormatter: (value) => (value == null ? '-' : Number(value as any).toFixed(2)) },
  ]), []);

  return (
    <Box component="main" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }} dir="rtl">
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="caption" color="text.secondary">رقم الأمر</Typography>
          <Typography variant="h6" fontWeight={600}>{po?.poNumber}</Typography>
        </Box>
        <Paper variant="outlined" sx={{ px: 1.5, py: 0.5 }}>
          <Typography variant="body2">{po && statusLabel(po.status)}</Typography>
        </Paper>
      </Stack>

      <Tabs value={tab} onChange={(_e, v) => setTab(v)} aria-label="PO tabs">
        <Tab label="المرفقات" value="attachments" />
        <Tab label="المراجعة (OCR)" value="ocr" />
        <Tab label="البنود" value="lines" />
      </Tabs>

      {tab==='attachments' && (
        <Stack spacing={2}>
          <Typography variant="body2">تحميل الفاتورة/الإيصال</Typography>
          <Button variant="outlined" component="label">
            اختر ملف
            <input
              hidden
              type="file"
              accept="image/*,.png,.jpg,.jpeg,.pdf,.txt"
              onChange={(e: ChangeEvent<HTMLInputElement>)=>{ const f=e.target.files?.[0]; if (f) onUpload(f); }}
            />
          </Button>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1 }}>
            {attachments.map((u: string, i: number) => (
              <Box key={i}>
                <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
                  <a href={u} target="_blank" rel="noreferrer">
                    <img src={u} alt="attachment" style={{ width: '100%', objectFit: 'contain' }} />
                  </a>
                </Paper>
              </Box>
            ))}
          </Box>
        </Stack>
      )}

      {tab==='ocr' && (
        <Stack spacing={2}>
          <Typography variant="body2">نص الإيصال</Typography>
          <TextField value={rawText} onChange={(e)=>setRawText(e.target.value)} placeholder="ألصق النص المستخرج هنا (اختياري)" multiline minRows={6} />
          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={onParse}>قراءة النص (OCR)</Button>
            <Button variant="contained" color="success" onClick={onReceive}>تأكيد الاستلام</Button>
          </Stack>
          <DataTable rows={ocrRows} columns={ocrColumns} autoHeight />
          {review.length===0 && (
            <Typography variant="body2" color="text.secondary">أضف ملفًا أو الصق نص الإيصال لبدء المراجعة</Typography>
          )}
        </Stack>
      )}

      {tab==='lines' && (
        <Stack spacing={1}>
          <DataTable rows={(po?.lines||[]).map((l:any, i:number)=>({ id:i, ...l }))} columns={lineColumns} autoHeight />
          <Stack direction="row" justifyContent="flex-end" sx={{ pt: 1 }}>
            <Button
              variant="outlined"
              onClick={async () => {
                const received = (po?.lines||[])
                  .filter((l: any) => (l.quantityReceived||0) > 0 && l.sku)
                  .map((l: any) => ({
                    sku: l.sku,
                    name_ar: po?.name_ar || '',
                    size: l.size,
                    color: l.color,
                    price: l.unitCost,
                    qty: l.quantityReceived || 1,
                    barcode: l.barcode,
                    brand: po?.supplier || undefined,
                  }));
                if (received.length === 0) { setSnack({ open: true, severity: 'info', message: 'لا توجد بنود مستلمة' }); return; }
                const res = await fetch('/api/labels/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ template: 'thermal-80', items: received, options: { barcodeType: 'auto', show: { name: true, sku: true, sizeColor: true, price: true } } }) });
                if (!res.ok) { setSnack({ open: true, severity: 'error', message: 'تعذر توليد الملصقات' }); return; }
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const popup = window.open(url, '_blank');
                popup?.focus();
              }}
            >
              طباعة ملصقات للبنود المستلمة
            </Button>
          </Stack>
        </Stack>
      )}

      <Stack sx={{ mt: 2 }}>
        <Button variant="text" onClick={() => { window.location.href='/purchase-orders'; }}>عودة للقائمة</Button>
      </Stack>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ ...snack, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnack({ ...snack, open: false })} severity={snack.severity} variant="filled" sx={{ width: '100%' }}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}

