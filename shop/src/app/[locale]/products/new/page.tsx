"use client";
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { uuid } from '@/lib/pos/idempotency';
import { generateSku } from '@/lib/sku';

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

  function addVariantRow() {
    setVariants((arr) => arr.concat([{ sku: '', size: '', color: '', retailPrice: basePrice ? Number(basePrice) : undefined }]));
  }

  function generateVariants() {
    function parseList(input: string): string[] {
      // Normalize and remove hidden directionality/zero-width marks that may break splitting
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
    }
  }

  return (
    <main className="p-4 flex flex-col gap-4" dir="rtl">
      <h1 className="text-xl font-semibold">{t('products.add') || 'إضافة منتج'}</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm">{t('products.code') || 'رمز المنتج'}</span>
          <input className="border rounded px-3 py-2" value={productCode} onChange={(e) => setProductCode(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm">{t('products.name_ar') || 'الاسم (ع)'}</span>
          <input className="border rounded px-3 py-2" value={name_ar} onChange={(e) => setNameAr(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm">{t('products.name_en') || 'الاسم (E)'}</span>
          <input dir="ltr" className="border rounded px-3 py-2" value={name_en} onChange={(e) => setNameEn(e.target.value)} />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm">{t('products.category') || 'التصنيف'}</span>
          <input className="border rounded px-3 py-2" value={category} onChange={(e) => setCategory(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm">{t('products.brand') || 'العلامة'}</span>
          <input className="border rounded px-3 py-2" value={brand} onChange={(e) => setBrand(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm">{t('products.basePrice') || 'السعر الأساسي'}</span>
          <input className="border rounded px-3 py-2" value={basePrice} onChange={(e) => setBasePrice(e.target.value === '' ? '' : Number(e.target.value))} type="number" min="0" step="0.01" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm">{t('products.status') || 'الحالة'}</span>
          <select className="border rounded px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value as any)}>
            <option value="active">{t('products.active') || 'نشط'}</option>
            <option value="archived">{t('products.archived') || 'مؤرشف'}</option>
          </select>
        </label>
      </div>

      <div className="border rounded p-3 flex flex-col gap-3">
        <div className="flex items-end gap-2">
          <label className="flex-1">
            <div className="text-sm">{t('products.sizes') || 'المقاسات (مفصولة بفواصل)'}</div>
            <input value={sizesInput} onChange={(e) => setSizesInput(e.target.value)} className="border rounded px-3 py-2 w-full" />
          </label>
          <label className="flex-1">
            <div className="text-sm">{t('products.colors') || 'الألوان (مفصولة بفواصل)'}</div>
            <input value={colorsInput} onChange={(e) => setColorsInput(e.target.value)} className="border rounded px-3 py-2 w-full" />
          </label>
          <button onClick={generateVariants} className="px-3 py-2 rounded bg-gray-800 text-white">{t('products.generateVariants') || 'توليد الخيارات'}</button>
          <button onClick={addVariantRow} className="px-3 py-2 rounded border">{t('products.addVariant') || 'إضافة سطر'}</button>
        </div>

        <div className="overflow-auto">
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
              {variants.map((v, idx) => (
                <tr key={idx} className="border-t">
                  <td className="p-2"><input dir="ltr" className="border rounded px-2 py-1 w-56" value={v.sku} onChange={(e) => setVariants((arr) => arr.map((x, i) => i === idx ? { ...x, sku: e.target.value } : x))} /></td>
                  <td className="p-2"><input className="border rounded px-2 py-1 w-24" value={v.size || ''} onChange={(e) => setVariants((arr) => arr.map((x, i) => i === idx ? { ...x, size: e.target.value } : x))} /></td>
                  <td className="p-2"><input className="border rounded px-2 py-1 w-24" value={v.color || ''} onChange={(e) => setVariants((arr) => arr.map((x, i) => i === idx ? { ...x, color: e.target.value } : x))} /></td>
                  <td className="p-2"><input type="number" min="0" step="0.01" className="border rounded px-2 py-1 w-28" value={v.costPrice ?? ''} onChange={(e) => setVariants((arr) => arr.map((x, i) => i === idx ? { ...x, costPrice: e.target.value === '' ? undefined : Number(e.target.value) } : x))} /></td>
                  <td className="p-2"><input type="number" min="0" step="0.01" className="border rounded px-2 py-1 w-28" value={v.retailPrice ?? ''} onChange={(e) => setVariants((arr) => arr.map((x, i) => i === idx ? { ...x, retailPrice: e.target.value === '' ? undefined : Number(e.target.value) } : x))} /></td>
                  <td className="p-2"><input className="border rounded px-2 py-1 w-40" value={v.barcode || ''} onChange={(e) => setVariants((arr) => arr.map((x, i) => i === idx ? { ...x, barcode: e.target.value } : x))} /></td>
                </tr>
              ))}
              {variants.length === 0 && <tr><td className="p-3 text-center text-gray-500" colSpan={6}>{t('products.noVariants') || 'لا توجد خيارات'}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={save} className="px-4 py-2 rounded bg-green-600 text-white">{t('common.confirm') || 'تأكيد'}</button>
      </div>
    </main>
  );
}


