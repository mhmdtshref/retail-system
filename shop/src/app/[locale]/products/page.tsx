"use client";
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

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

  return (
    <main className="p-4 flex flex-col gap-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t('products.title') || 'المنتجات'}</h1>
        <div className="flex gap-2">
          <Link href={`/${locale}/products/import`} className="px-3 py-2 rounded bg-blue-600 text-white">{t('products.importCsv') || 'استيراد CSV'}</Link>
          <Link href={`/${locale}/products/new`} className="px-3 py-2 rounded bg-green-600 text-white">{t('products.add') || 'إضافة منتج'}</Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <input value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} placeholder={t('products.searchPlaceholder') || 'بحث'} className="border rounded px-3 py-2" />
        <select value={filters.status || ''} onChange={(e) => { setPage(1); setFilters({ ...filters, status: e.target.value || undefined }); }} className="border rounded px-3 py-2">
          <option value="">{t('products.status') || 'الحالة'}</option>
          <option value="active">{t('products.active') || 'نشط'}</option>
          <option value="archived">{t('products.archived') || 'مؤرشف'}</option>
        </select>
        <input value={filters.category || ''} onChange={(e) => { setPage(1); setFilters({ ...filters, category: e.target.value || undefined }); }} placeholder={t('products.category') || 'التصنيف'} className="border rounded px-3 py-2" />
        <input value={filters.brand || ''} onChange={(e) => { setPage(1); setFilters({ ...filters, brand: e.target.value || undefined }); }} placeholder={t('products.brand') || 'العلامة'} className="border rounded px-3 py-2" />
        <input value={filters.size || ''} onChange={(e) => { setPage(1); setFilters({ ...filters, size: e.target.value || undefined }); }} placeholder={t('products.size') || 'المقاس'} className="border rounded px-3 py-2" />
        <input value={filters.color || ''} onChange={(e) => { setPage(1); setFilters({ ...filters, color: e.target.value || undefined }); }} placeholder={t('products.color') || 'اللون'} className="border rounded px-3 py-2" />
      </div>

      <div className="overflow-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-right">{t('products.name') || 'المنتج'}</th>
              <th className="p-2 text-right">{t('products.code') || 'الرمز'}</th>
              <th className="p-2 text-right">{t('products.category') || 'التصنيف'}</th>
              <th className="p-2 text-right">{t('products.brand') || 'العلامة'}</th>
              <th className="p-2 text-right">{t('products.variants') || 'الخيارات'}</th>
              <th className="p-2 text-right">{t('products.updatedAt') || 'آخر تحديث'}</th>
              <th className="p-2 text-right">{t('products.actions') || 'إجراءات'}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p._id} className="border-t">
                <td className="p-2">{p.name_ar || p.name_en}</td>
                <td className="p-2"><bdi dir="ltr">{p.productCode}</bdi></td>
                <td className="p-2">{p.category}</td>
                <td className="p-2">{p.brand}</td>
                <td className="p-2">
                  <div className="flex flex-wrap gap-1">
                    {p.variants.slice(0, 5).map((v) => (
                      <span key={v.sku} className="inline-flex items-center gap-1 rounded border px-2 py-0.5" title={v.sku}>
                        <span className="text-xs text-gray-500">{v.size}</span>
                        <span className="text-xs">{v.color}</span>
                        {availability[v.sku] && (
                          <span className="text-[10px] text-green-700">{availability[v.sku].available}</span>
                        )}
                      </span>
                    ))}
                    {p.variants.length > 5 && <span className="text-xs text-gray-500">+{p.variants.length - 5}</span>}
                  </div>
                </td>
                <td className="p-2">{new Date(p.updatedAt).toLocaleString(locale)}</td>
                <td className="p-2">
                  <Link href={`/${locale}/products/${p._id}`} className="underline">{t('products.edit') || 'تعديل'}</Link>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td className="p-3 text-center text-gray-500" colSpan={7}>{t('products.noResults') || 'لا نتائج'}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-center gap-2">
        <button className="px-2 py-1 border rounded disabled:opacity-50" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>{t('products.prev') || 'السابق'}</button>
        <span className="text-sm">{page} / {totalPages}</span>
        <button className="px-2 py-1 border rounded disabled:opacity-50" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>{t('products.next') || 'التالي'}</button>
      </div>
    </main>
  );
}


