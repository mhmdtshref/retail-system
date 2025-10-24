"use client";
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Box, Button, Chip, Stack, TextField, Typography } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';

type Product = {
  _id: string;
  productCode: string;
  name_ar?: string;
  name_en?: string;
  category?: string;
  brand?: string;
  status: 'active'|'archived';
  updatedAt: string;
  variants: Array<{ sku: string; size?: string; color?: string }>;
};

export default function ProductsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState<{ status?: string; category?: string; brand?: string; size?: string; color?: string }>({});
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const pageSize = 20;
  const [availability, setAvailability] = useState<Record<string, { onHand: number; reserved: number; available: number }>>({});

  useEffect(() => {
    const url = new URL(`/api/products`, window.location.origin);
    if (q) url.searchParams.set('q', q);
    if (filters.status) url.searchParams.set('status', filters.status);
    if (filters.category) url.searchParams.set('category', filters.category);
    if (filters.brand) url.searchParams.set('brand', filters.brand);
    if (filters.size) url.searchParams.set('size', filters.size);
    if (filters.color) url.searchParams.set('color', filters.color);
    url.searchParams.set('page', String(page));
    url.searchParams.set('pageSize', String(pageSize));
    (async () => {
      const res = await fetch(url.toString());
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
      const skus = (data.items || []).flatMap((p: Product) => p.variants.map((v) => v.sku)).slice(0, 200);
      if (skus.length) {
        const avRes = await fetch(`/api/products/availability/bulk?` + skus.map((s: string) => `skus[]=${encodeURIComponent(s)}`).join('&'));
        if (avRes.ok) {
          const a = await avRes.json();
          const map: Record<string, any> = {};
          for (const row of a.availability || []) map[row.sku] = row;
          setAvailability(map);
        }
      } else {
        setAvailability({});
      }
    })();
  }, [q, filters.status, filters.category, filters.brand, filters.size, filters.color, page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const columns: GridColDef<Product>[] = [
    { field: 'name', headerName: t('products.name') || 'المنتج', flex: 1, valueGetter: (_value, row) => row.name_ar || row.name_en },
    { field: 'productCode', headerName: t('products.code') || 'الرمز', width: 160, renderCell: (p) => <bdi dir="ltr">{p.value as string}</bdi> },
    { field: 'category', headerName: t('products.category') || 'التصنيف', width: 140 },
    { field: 'brand', headerName: t('products.brand') || 'العلامة', width: 140 },
    { field: 'variants', headerName: t('products.variants') || 'الخيارات', flex: 1, sortable: false, renderCell: (p) => {
      const list = (p.row.variants || []).slice(0, 5);
      return (
        <Stack direction="row" spacing={0.5} flexWrap="wrap">
          {list.map((v: any, i: number) => (
            <Chip key={`${v.sku}-${p.row._id}-${i}`} variant="outlined" size="small" label={v.color} title={v.sku} />
          ))}
          {(p.row.variants?.length || 0) > 5 && (
            <Typography variant="caption" color="text.secondary">+{p.row.variants.length - 5}</Typography>
          )}
        </Stack>
      );
    }},
    { field: 'updatedAt', headerName: t('products.updatedAt') || 'آخر تحديث', width: 200, valueGetter: (_value, row) => row.updatedAt, valueFormatter: (value) => new Date(String(value as any)).toLocaleString(locale) },
    { field: 'actions', headerName: t('products.actions') || 'إجراءات', width: 140, sortable: false, renderCell: (p) => (
      <Link href={`/${locale}/products/${p.row._id}`} style={{ textDecoration: 'underline' }}>{t('products.edit') || 'تعديل'}</Link>
    ) },
  ];

  return (
    <Box component="main" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }} dir="rtl">
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h6" fontWeight={600}>{t('products.title') || 'المنتجات'}</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="contained" onClick={() => router.push(`/${locale}/products/import`)}>{t('products.importCsv') || 'استيراد CSV'}</Button>
          <Button variant="contained" color="success" onClick={() => router.push(`/${locale}/products/new`)}>{t('products.add') || 'إضافة منتج'}</Button>
          <Button variant="outlined" onClick={() => router.push(`/${locale}/labels`)}>طباعة ملصقات</Button>
        </Stack>
      </Stack>

      <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center">
        <TextField size="small" value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} placeholder={t('products.searchPlaceholder') || 'بحث'} />
        <TextField size="small" select value={filters.status || ''} onChange={(e) => { setPage(1); setFilters({ ...filters, status: (e.target as HTMLInputElement).value || undefined }); }}>
          <option value="">{t('products.status') || 'الحالة'}</option>
          <option value="active">{t('products.active') || 'نشط'}</option>
          <option value="archived">{t('products.archived') || 'مؤرشف'}</option>
        </TextField>
        <TextField size="small" value={filters.category || ''} onChange={(e) => { setPage(1); setFilters({ ...filters, category: e.target.value || undefined }); }} placeholder={t('products.category') || 'التصنيف'} />
        <TextField size="small" value={filters.brand || ''} onChange={(e) => { setPage(1); setFilters({ ...filters, brand: e.target.value || undefined }); }} placeholder={t('products.brand') || 'العلامة'} />
        <TextField size="small" value={filters.size || ''} onChange={(e) => { setPage(1); setFilters({ ...filters, size: e.target.value || undefined }); }} placeholder={t('products.size') || 'المقاس'} />
        <TextField size="small" value={filters.color || ''} onChange={(e) => { setPage(1); setFilters({ ...filters, color: e.target.value || undefined }); }} placeholder={t('products.color') || 'اللون'} />
      </Stack>

      <Box sx={{ height: 560, width: '100%' }}>
        <DataGrid
          rows={items}
          getRowId={(r) => r._id}
          rowCount={total}
          paginationMode="server"
          paginationModel={{ page: page - 1, pageSize }}
          onPaginationModelChange={(m) => setPage(m.page + 1)}
          columns={columns}
          disableRowSelectionOnClick
          density="compact"
          loading={false}
        />
      </Box>

      <Stack direction="row" justifyContent="center" alignItems="center" spacing={1}>
        <Button variant="outlined" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>{t('products.prev') || 'السابق'}</Button>
        <Typography fontSize={14}>{page} / {totalPages}</Typography>
        <Button variant="outlined" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>{t('products.next') || 'التالي'}</Button>
      </Stack>
    </Box>
  );
}


