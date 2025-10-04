"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { uuid } from '@/lib/pos/idempotency';

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
  const [p, setP] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/products/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setP(data.product);
    })();
  }, [id]);

  async function save() {
    if (!p) return;
    setSaving(true);
    const idk = uuid();
    const res = await fetch(`/api/products/${p._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idk },
      body: JSON.stringify({
        name_ar: p.name_ar,
        name_en: p.name_en,
        category: p.category,
        brand: p.brand,
        basePrice: p.basePrice,
        status: p.status,
        variants: p.variants
      })
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      setP(data.product);
    }
  }

  async function archive() {
    if (!p) return;
    const res = await fetch(`/api/products/${p._id}`, { method: 'DELETE' });
    if (res.ok) router.push(`/${locale}/products`);
  }

  if (!p) return <main className="p-4" dir="rtl">...</main>;

  return (
    <main className="p-4 flex flex-col gap-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t('products.edit') || 'تعديل المنتج'}</h1>
        <div className="flex gap-2">
          <button onClick={archive} className="px-3 py-2 rounded bg-red-600 text-white">{t('products.archive') || 'أرشفة'}</button>
          <button onClick={save} disabled={saving} className="px-3 py-2 rounded bg-green-600 text-white disabled:opacity-50">{t('common.confirm') || 'تأكيد'}</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm">{t('products.code') || 'رمز المنتج'}</span>
          <input disabled className="border rounded px-3 py-2 bg-gray-50" value={p.productCode} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm">{t('products.name_ar') || 'الاسم (ع)'}</span>
          <input className="border rounded px-3 py-2" value={p.name_ar || ''} onChange={(e) => setP({ ...p, name_ar: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm">{t('products.name_en') || 'الاسم (E)'}</span>
          <input dir="ltr" className="border rounded px-3 py-2" value={p.name_en || ''} onChange={(e) => setP({ ...p, name_en: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm">{t('products.category') || 'التصنيف'}</span>
          <input className="border rounded px-3 py-2" value={p.category || ''} onChange={(e) => setP({ ...p, category: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm">{t('products.brand') || 'العلامة'}</span>
          <input className="border rounded px-3 py-2" value={p.brand || ''} onChange={(e) => setP({ ...p, brand: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm">{t('products.basePrice') || 'السعر الأساسي'}</span>
          <input type="number" min="0" step="0.01" className="border rounded px-3 py-2" value={p.basePrice ?? ''} onChange={(e) => setP({ ...p, basePrice: e.target.value === '' ? undefined : Number(e.target.value) })} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm">{t('products.status') || 'الحالة'}</span>
          <select className="border rounded px-3 py-2" value={p.status} onChange={(e) => setP({ ...p, status: e.target.value as any })}>
            <option value="active">{t('products.active') || 'نشط'}</option>
            <option value="archived">{t('products.archived') || 'مؤرشف'}</option>
          </select>
        </label>
      </div>

      <div className="border rounded p-3 overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-2 text-right">SKU</th>
              <th className="p-2 text-right">{t('products.size') || 'المقاس'}</th>
              <th className="p-2 text-right">{t('products.color') || 'اللون'}</th>
              <th className="p-2 text-right">{t('products.costPrice') || 'سعر الكلفة'}</th>
              <th className="p-2 text-right">{t('products.retailPrice') || 'سعر البيع'}</th>
              <th className="p-2 text-right">{t('products.barcode') || 'الباركود'}</th>
            </tr>
          </thead>
          <tbody>
            {p.variants.map((v, idx) => (
              <tr key={v.sku} className="border-t">
                <td className="p-2"><input dir="ltr" className="border rounded px-2 py-1 w-56" value={v.sku} onChange={(e) => setP({ ...p, variants: p.variants.map((x, i) => i === idx ? { ...x, sku: e.target.value } : x) })} /></td>
                <td className="p-2"><input className="border rounded px-2 py-1 w-24" value={v.size || ''} onChange={(e) => setP({ ...p, variants: p.variants.map((x, i) => i === idx ? { ...x, size: e.target.value } : x) })} /></td>
                <td className="p-2"><input className="border rounded px-2 py-1 w-24" value={v.color || ''} onChange={(e) => setP({ ...p, variants: p.variants.map((x, i) => i === idx ? { ...x, color: e.target.value } : x) })} /></td>
                <td className="p-2"><input type="number" min="0" step="0.01" className="border rounded px-2 py-1 w-28" value={v.costPrice ?? ''} onChange={(e) => setP({ ...p, variants: p.variants.map((x, i) => i === idx ? { ...x, costPrice: e.target.value === '' ? undefined : Number(e.target.value) } : x) })} /></td>
                <td className="p-2"><input type="number" min="0" step="0.01" className="border rounded px-2 py-1 w-28" value={v.retailPrice ?? ''} onChange={(e) => setP({ ...p, variants: p.variants.map((x, i) => i === idx ? { ...x, retailPrice: e.target.value === '' ? undefined : Number(e.target.value) } : x) })} /></td>
                <td className="p-2"><input className="border rounded px-2 py-1 w-40" value={v.barcode || ''} onChange={(e) => setP({ ...p, variants: p.variants.map((x, i) => i === idx ? { ...x, barcode: e.target.value } : x) })} /></td>
              </tr>
            ))}
            {p.variants.length === 0 && <tr><td className="p-3 text-center text-gray-500" colSpan={6}>{t('products.noVariants') || 'لا توجد خيارات'}</td></tr>}
          </tbody>
        </table>
      </div>
    </main>
  );
}


