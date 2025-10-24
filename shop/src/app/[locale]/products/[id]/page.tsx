"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { uuid } from '@/lib/pos/idempotency';
import { Box, Button, Stack, TextField, Typography, Select, MenuItem, Snackbar, Alert } from '@mui/material';
import { DataTable } from '@/components/mui/DataTable';
import type { GridColDef, GridRowModel } from '@mui/x-data-grid';
import { ConfirmDialog } from '@/components/mui/ConfirmDialog';

type Product = {
  _id: string;
  productCode: string;
  name_ar?: string;
  name_en?: string;
  category?: string;
  brand?: string;
  basePrice?: number;
  status: 'active'|'archived';
  images?: string[];
  variants: Array<{ sku: string; size?: string; color?: string; barcode?: string; costPrice?: number; retailPrice?: number }>;
};

export default function EditProductPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const params = useParams() as any;
  const id = params?.id as string;
  const [product, setProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success'|'info'|'warning'|'error' }>({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/products/${id}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setProduct(data.product);
    })();
  }, [id]);

  async function save() {
    if (!product) return;
    setSaving(true);
    const idk = uuid();
    try {
      const res = await fetch(`/api/products/${product._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idk },
        body: JSON.stringify({
          name_ar: product.name_ar,
          name_en: product.name_en,
          category: product.category,
          brand: product.brand,
          basePrice: product.basePrice,
          status: product.status,
          variants: product.variants
        })
      });
      if (res.ok) {
        const data = await res.json();
        setProduct(data.product);
        setSnack({ open: true, message: t('common.saved') || 'تم الحفظ', severity: 'success' });
      } else {
        setSnack({ open: true, message: t('common.error') || 'حدث خطأ', severity: 'error' });
      }
    } finally {
      setSaving(false);
    }
  }

  async function doArchive() {
    if (!product) return;
    const res = await fetch(`/api/products/${product._id}`, { method: 'DELETE' });
    if (res.ok) router.push(`/${locale}/products`);
  }

  function onVariantRowUpdate(newRow: GridRowModel, _oldRow: GridRowModel) {
    if (!product) return newRow;
    const idx = Number(newRow.id);
    const updated = [...product.variants];
    updated[idx] = {
      sku: String(newRow.sku || ''),
      size: newRow.size ? String(newRow.size) : undefined,
      color: newRow.color ? String(newRow.color) : undefined,
      barcode: newRow.barcode ? String(newRow.barcode) : undefined,
      costPrice: newRow.costPrice === '' || newRow.costPrice === null || newRow.costPrice === undefined ? undefined : Number(newRow.costPrice),
      retailPrice: newRow.retailPrice === '' || newRow.retailPrice === null || newRow.retailPrice === undefined ? undefined : Number(newRow.retailPrice),
    };
    setProduct({ ...product, variants: updated });
    return { ...newRow };
  }

  const columns: GridColDef[] = [
    { field: 'sku', headerName: 'SKU', width: 200, editable: true, renderCell: (p) => <Typography component="span" dir="ltr">{String((p as any).value || '')}</Typography> },
    { field: 'size', headerName: t('products.size') || 'المقاس', width: 140, editable: true },
    { field: 'color', headerName: t('products.color') || 'اللون', width: 140, editable: true },
    { field: 'costPrice', headerName: t('products.costPrice') || 'سعر الكلفة', width: 160, editable: true, type: 'number', valueFormatter: ({ value }: any) => value === undefined || value === null || value === '' ? '' : Number(value).toFixed(2) },
    { field: 'retailPrice', headerName: t('products.retailPrice') || 'سعر البيع', width: 160, editable: true, type: 'number', valueFormatter: ({ value }: any) => value === undefined || value === null || value === '' ? '' : Number(value).toFixed(2) },
    { field: 'barcode', headerName: t('products.barcode') || 'الباركود', width: 180, editable: true },
  ];

  if (!product) return <Box component="main" sx={{ p: 2 }} dir="rtl">...</Box>;

  return (
    <Box component="main" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }} dir="rtl">
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h6" fontWeight={600}>{t('products.edit') || 'تعديل المنتج'}</Typography>
        <Stack direction="row" spacing={1}>
          <Button onClick={() => setConfirmArchive(true)} variant="contained" color="error">{t('products.archive') || 'أرشفة'}</Button>
          <Button onClick={save} disabled={saving} variant="contained" color="success">{t('common.confirm') || 'تأكيد'}</Button>
        </Stack>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }, gap: 2 }}>
        <TextField size="small" fullWidth label={t('products.code') || 'رمز المنتج'} value={product.productCode} disabled />
        <TextField size="small" fullWidth label={t('products.name_ar') || 'الاسم (ع)'} value={product.name_ar || ''} onChange={(e) => setProduct({ ...product, name_ar: e.target.value })} />
        <TextField size="small" fullWidth label={t('products.name_en') || 'الاسم (E)'} inputProps={{ dir: 'ltr' }} value={product.name_en || ''} onChange={(e) => setProduct({ ...product, name_en: e.target.value })} />

        <TextField size="small" fullWidth label={t('products.category') || 'التصنيف'} value={product.category || ''} onChange={(e) => setProduct({ ...product, category: e.target.value })} />
        <TextField size="small" fullWidth label={t('products.brand') || 'العلامة'} value={product.brand || ''} onChange={(e) => setProduct({ ...product, brand: e.target.value })} />
        <TextField size="small" fullWidth type="number" inputProps={{ step: '0.01', min: '0' }} label={t('products.basePrice') || 'السعر الأساسي'} value={product.basePrice ?? ''} onChange={(e) => setProduct({ ...product, basePrice: e.target.value === '' ? undefined : Number(e.target.value) })} />
        <Select size="small" value={product.status} onChange={(e) => setProduct({ ...product, status: e.target.value as any })} displayEmpty>
          <MenuItem value="active">{t('products.active') || 'نشط'}</MenuItem>
          <MenuItem value="archived">{t('products.archived') || 'مؤرشف'}</MenuItem>
        </Select>
      </Box>

      <DataTable
        rows={product.variants.map((v, i) => ({ id: i, ...v }))}
        columns={columns}
        autoHeight
        editMode="row"
        processRowUpdate={(newRow, oldRow) => onVariantRowUpdate(newRow, oldRow)}
      />

      <ConfirmDialog
        open={confirmArchive}
        title={t('products.archive') || 'أرشفة'}
        description={t('products.archiveConfirm') || 'هل أنت متأكد من أرشفة هذا المنتج؟'}
        confirmColor="error"
        onConfirm={() => { setConfirmArchive(false); doArchive(); }}
        onClose={() => setConfirmArchive(false)}
      />

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
        <Alert severity={snack.severity} variant="filled" onClose={() => setSnack({ ...snack, open: false })}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}


