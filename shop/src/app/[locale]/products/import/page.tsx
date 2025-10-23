"use client";
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Alert,
  Box,
  Button,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DataTable } from '@/components/mui/DataTable';
import { GridColDef } from '@mui/x-data-grid';

type Result = { idx: number; outcome: 'insert'|'update'|'error'; messages: string[]; preview?: any };

export default function ImportProductsPage() {
  const t = useTranslations();
  const [step, setStep] = useState<'upload'|'map'|'preview'>('upload');
  const [csvText, setCsvText] = useState('');
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Result[]>([]);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success'|'info'|'warning'|'error' }>(
    { open: false, message: '', severity: 'success' }
  );

  async function onValidate() {
    const res = await fetch('/api/products/import/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: csvText, mapping })
    });
    if (res.ok) {
      const data = await res.json();
      setResults(data.results || []);
      setBatchId(data.batchId);
      setStep('preview');
    }
  }

  async function onApply() {
    if (!batchId) return;
    const res = await fetch('/api/products/import/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batchId })
    });
    if (res.ok) {
      const data = await res.json();
      setSnack({ open: true, severity: 'success', message: (t('products.importApplied') || 'تم التطبيق') + ` +${(data?.inserted||0) + (data?.updated||0)}` });
    }
  }

  const previewColumns: GridColDef[] = useMemo(() => ([
    { field: 'idx', headerName: '#', width: 80 },
    { field: 'outcome', headerName: t('products.outcome') || 'النتيجة', width: 140 },
    { field: 'messages', headerName: t('products.messages') || 'رسائل', flex: 1, renderCell: (p) => (
      <Typography variant="body2" color="error" noWrap title={p.value as string}>{p.value as string}</Typography>
    ) },
    { field: 'preview', headerName: t('products.preview') || 'المعاينة', flex: 1.5, sortable: false, renderCell: (p) => (
      <Typography variant="caption" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{p.value as string}</Typography>
    ) },
  ]), [t]);

  const previewRows = useMemo(() => results.map((r) => ({
    id: r.idx,
    idx: r.idx,
    outcome: r.outcome,
    messages: (r.messages || []).join('; '),
    preview: r.preview ? JSON.stringify(r.preview, null, 2) : '',
  })), [results]);

  return (
    <Box component="main" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }} dir="rtl">
      <Typography variant="h6" fontWeight={600}>{t('products.importCsv') || 'استيراد CSV'}</Typography>

      {step === 'upload' && (
        <Stack direction="column" spacing={2}>
          <Stack direction="row" spacing={1}>
            <Button component="a" href={`/api/products/import/template?type=basic`} variant="outlined">
              {t('products.downloadTemplate') || 'تنزيل قالب CSV'}
            </Button>
          </Stack>
          <TextField
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={t('products.pasteCsv') || 'ألصق CSV هنا (UTF-8)'}
            multiline
            minRows={10}
          />
          <Stack direction="row" spacing={1}>
            <Button onClick={() => setStep('map')} disabled={!csvText} variant="contained">
              {t('products.next') || 'التالي'}
            </Button>
          </Stack>
        </Stack>
      )}

      {step === 'map' && (
        <Stack direction="column" spacing={2}>
          <Typography variant="body2" color="text.secondary">
            {t('products.mappingHint') || 'يمكن تعيين الأعمدة يدويًا (اختياري)'}
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 1 }}>
            {['productCode','name_ar','name_en','category','brand','size','color','retailPrice','costPrice','barcode','status','sku'].map((k) => (
              <TextField
                key={k}
                size="small"
                label={k}
                value={mapping[k] || ''}
                onChange={(e) => setMapping({ ...mapping, [k]: e.target.value })}
                placeholder={`${k} => Header`}
                inputProps={{ dir: 'ltr' }}
              />
            ))}
          </Box>
          <Stack direction="row" spacing={1}>
            <Button onClick={onValidate} variant="contained" color="success">
              {t('products.validate') || 'تحقق/معاينة'}
            </Button>
          </Stack>
        </Stack>
      )}

      {step === 'preview' && (
        <Stack direction="column" spacing={2}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button onClick={onApply} variant="contained" color="success">{t('products.apply') || 'تطبيق'}</Button>
          </Stack>
          <DataTable rows={previewRows} columns={previewColumns} autoHeight />
        </Stack>
      )}

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack({ ...snack, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnack({ ...snack, open: false })} severity={snack.severity} variant="filled" sx={{ width: '100%' }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}


