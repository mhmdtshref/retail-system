"use client";
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { uuid } from '@/lib/pos/idempotency';
import { generateSku } from '@/lib/sku';
import { Box, Button, Grid, Stack, TextField, Typography, Select, MenuItem, Snackbar, Alert } from '@mui/material';
import { DataTable } from '@/components/mui/DataTable';
import type { GridColDef, GridRowModel } from '@mui/x-data-grid';

type Variant = { sku: string; size?: string; color?: string; barcode?: string; costPrice?: number; retailPrice?: number };

export default function NewProductPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [productCode, setProductCode] = useState('');
  const [name_ar, setNameAr] = useState('');
  const [name_en, setNameEn] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [basePrice, setBasePrice] = useState<number | ''>('');
  const [status, setStatus] = useState<'active'|'archived'>('active');
  const [variants, setVariants] = useState<Variant[]>([]);
  const [sizesInput, setSizesInput] = useState('');
  const [colorsInput, setColorsInput] = useState('');
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success'|'info'|'warning'|'error' }>({ open: false, message: '', severity: 'info' });

  function addVariantRow() {
    setVariants((arr) => arr.concat([{ sku: '', size: '', color: '', retailPrice: basePrice ? Number(basePrice) : undefined }]));
  }

  function generateVariants() {
    function parseList(input: string): string[] {
      const cleaned = (input || '').replaceAll("،", ",");
      return cleaned.split(",").map((s) => s.trim()).filter(Boolean);
    }
    const sizes = parseList(sizesInput);
    const colors = parseList(colorsInput);
    const rows: Variant[] = [];
    for (const sz of sizes.length ? sizes : ['']) {
      for (const c of colors.length ? colors : ['']) {
        const sku = generateSku(productCode, sz || undefined, c || undefined);
        rows.push({ sku, size: sz || undefined, color: c || undefined, retailPrice: basePrice ? Number(basePrice) : undefined });
      }
    }
    setVariants(rows);
  }

  function onVariantRowUpdate(newRow: GridRowModel, oldRow: GridRowModel) {
    const idx = Number(newRow.id);
    const updated = [...variants];
    updated[idx] = {
      sku: String(newRow.sku || ''),
      size: newRow.size ? String(newRow.size) : undefined,
      color: newRow.color ? String(newRow.color) : undefined,
      barcode: newRow.barcode ? String(newRow.barcode) : undefined,
      costPrice: newRow.costPrice === '' || newRow.costPrice === null || newRow.costPrice === undefined ? undefined : Number(newRow.costPrice),
      retailPrice: newRow.retailPrice === '' || newRow.retailPrice === null || newRow.retailPrice === undefined ? undefined : Number(newRow.retailPrice),
    };
    setVariants(updated);
    return { ...newRow };
  }

  async function save() {
    const idk = uuid();
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idk },
      body: JSON.stringify({ productCode, name_ar, name_en, category, brand, basePrice: basePrice ? Number(basePrice) : undefined, status, variants })
    });
    if (res.ok) {
      const data = await res.json();
      router.push(`/${locale}/products/${data.product._id}`);
    } else {
      setSnack({ open: true, message: t('common.error') || 'حدث خطأ', severity: 'error' });
    }
  }

  const columns: GridColDef[] = [
    { field: 'sku', headerName: 'SKU', width: 200, editable: true, renderCell: (p) => <Typography component="span" dir="ltr">{String(p.value || '')}</Typography> },
    { field: 'size', headerName: t('products.size') || 'المقاس', width: 140, editable: true },
    { field: 'color', headerName: t('products.color') || 'اللون', width: 140, editable: true },
    { field: 'costPrice', headerName: t('products.costPrice') || 'سعر الكلفة', width: 160, editable: true, type: 'number', valueFormatter: (p) => p.value === undefined || p.value === null || p.value === '' ? '' : Number(p.value as any).toFixed(2) },
    { field: 'retailPrice', headerName: t('products.retailPrice') || 'سعر البيع', width: 160, editable: true, type: 'number', valueFormatter: (p) => p.value === undefined || p.value === null || p.value === '' ? '' : Number(p.value as any).toFixed(2) },
    { field: 'barcode', headerName: t('products.barcode') || 'الباركود', width: 180, editable: true },
  ];

  return (
    <Box component="main" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }} dir="rtl">
      <Typography variant="h6" fontWeight={600}>{t('products.add') || 'إضافة منتج'}</Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <TextField size="small" fullWidth label={t('products.code') || 'رمز المنتج'} value={productCode} onChange={(e) => setProductCode(e.target.value)} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField size="small" fullWidth label={t('products.name_ar') || 'الاسم (ع)'} value={name_ar} onChange={(e) => setNameAr(e.target.value)} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField size="small" fullWidth label={t('products.name_en') || 'الاسم (E)'} inputProps={{ dir: 'ltr' }} value={name_en} onChange={(e) => setNameEn(e.target.value)} />
        </Grid>

        <Grid item xs={12} md={4}>
          <TextField size="small" fullWidth label={t('products.category') || 'التصنيف'} value={category} onChange={(e) => setCategory(e.target.value)} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField size="small" fullWidth label={t('products.brand') || 'العلامة'} value={brand} onChange={(e) => setBrand(e.target.value)} />
        </Grid>
        <Grid item xs={12} md={2}>
          <TextField size="small" fullWidth type="number" inputProps={{ step: '0.01', min: '0' }} label={t('products.basePrice') || 'السعر الأساسي'} value={basePrice} onChange={(e) => setBasePrice(e.target.value === '' ? '' : Number(e.target.value))} />
        </Grid>
        <Grid item xs={12} md={2}>
          <Select size="small" fullWidth value={status} onChange={(e) => setStatus(e.target.value as any)} displayEmpty>
            <MenuItem value="active">{t('products.active') || 'نشط'}</MenuItem>
            <MenuItem value="archived">{t('products.archived') || 'مؤرشف'}</MenuItem>
          </Select>
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'stretch', md: 'flex-end' }}>
          <TextField size="small" fullWidth label={t('products.sizes') || 'المقاسات (مفصولة بفواصل)'} value={sizesInput} onChange={(e) => setSizesInput(e.target.value)} />
          <TextField size="small" fullWidth label={t('products.colors') || 'الألوان (مفصولة بفواصل)'} value={colorsInput} onChange={(e) => setColorsInput(e.target.value)} />
          <Button onClick={generateVariants} variant="contained">{t('products.generateVariants') || 'توليد الخيارات'}</Button>
          <Button onClick={addVariantRow} variant="outlined">{t('products.addVariant') || 'إضافة سطر'}</Button>
        </Stack>

        <DataTable
          rows={variants.map((v, i) => ({ id: i, ...v }))}
          columns={columns}
          autoHeight
          editMode="row"
          processRowUpdate={(newRow, oldRow) => onVariantRowUpdate(newRow, oldRow)}
        />
      </Box>

      <Stack direction="row" spacing={1}>
        <Button onClick={save} variant="contained" color="success">{t('common.confirm') || 'تأكيد'}</Button>
      </Stack>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
        <Alert severity={snack.severity} variant="filled" onClose={() => setSnack({ ...snack, open: false })}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}


