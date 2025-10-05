"use client";
import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
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
      if (!res.ok) { alert('خطأ في توليد PDF'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } finally { setBusy(false); }
  }
  async function downloadZpl() {
    const res = await fetch('/api/labels/zpl', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items, options: { barcodeType, show, shop: { name: shopName || undefined } } }) });
    if (!res.ok) { alert('خطأ في توليد ZPL'); return; }
    const text = await res.text();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'labels.zpl';
    a.click();
  }

  return (
    <main className="p-4 flex flex-col gap-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">طباعة الملصقات</h1>
      </div>

      <div className="p-3 rounded border flex flex-col gap-3">
        <div className="flex flex-wrap gap-2 items-center">
          <label className="text-sm">القالب</label>
          <select className="border rounded px-2 py-1" value={template} onChange={(e) => setTemplate(e.target.value as any)}>
            <option value="thermal-80">حراري 80مم</option>
            <option value="thermal-58">حراري 58مم</option>
            <option value="a4-3x8">A4 (3×8)</option>
          </select>
          <label className="text-sm">الباركود</label>
          <select className="border rounded px-2 py-1" value={barcodeType} onChange={(e) => setBarcodeType(e.target.value as any)}>
            <option value="auto">تلقائي</option>
            <option value="code128">Code128</option>
            <option value="ean13">EAN-13</option>
            <option value="qr">QR</option>
          </select>
          <input className="border rounded px-2 py-1" placeholder="اسم المتجر (اختياري)" value={shopName} onChange={(e)=> setShopName(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-4 items-center text-sm">
          <label className="inline-flex items-center gap-1"><input type="checkbox" checked={show.name} onChange={(e)=> setShow({...show, name: e.target.checked})}/> الاسم</label>
          <label className="inline-flex items-center gap-1"><input type="checkbox" checked={show.sku} onChange={(e)=> setShow({...show, sku: e.target.checked})}/> SKU</label>
          <label className="inline-flex items-center gap-1"><input type="checkbox" checked={show.sizeColor} onChange={(e)=> setShow({...show, sizeColor: e.target.checked})}/> المقاس/اللون</label>
          <label className="inline-flex items-center gap-1"><input type="checkbox" checked={show.price} onChange={(e)=> setShow({...show, price: e.target.checked})}/> السعر</label>
          <label className="inline-flex items-center gap-1"><input type="checkbox" checked={show.brand} onChange={(e)=> setShow({...show, brand: e.target.checked})}/> العلامة</label>
        </div>

        <div>
          <button onClick={addRow} className="px-3 py-2 rounded bg-gray-200">إضافة سطر</button>
        </div>
        <div className="overflow-auto border rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2">SKU</th>
                <th className="p-2">الباركود</th>
                <th className="p-2">الاسم (ع)</th>
                <th className="p-2">المقاس</th>
                <th className="p-2">اللون</th>
                <th className="p-2">السعر</th>
                <th className="p-2">العلامة</th>
                <th className="p-2">الكمية</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={idx} className="border-t">
                  <td className="p-2"><input className="border rounded px-2 py-1 w-40" value={it.sku||''} onChange={(e)=> updateItem(idx, { sku: e.target.value })} /></td>
                  <td className="p-2"><input className="border rounded px-2 py-1 w-40" value={it.barcode||''} onChange={(e)=> updateItem(idx, { barcode: e.target.value })} /></td>
                  <td className="p-2"><input className="border rounded px-2 py-1 w-56" value={it.name_ar||''} onChange={(e)=> updateItem(idx, { name_ar: e.target.value })} /></td>
                  <td className="p-2"><input className="border rounded px-2 py-1 w-24" value={it.size||''} onChange={(e)=> updateItem(idx, { size: e.target.value })} /></td>
                  <td className="p-2"><input className="border rounded px-2 py-1 w-24" value={it.color||''} onChange={(e)=> updateItem(idx, { color: e.target.value })} /></td>
                  <td className="p-2"><input type="number" className="border rounded px-2 py-1 w-24" value={it.price ?? ''} onChange={(e)=> updateItem(idx, { price: e.target.value ? Number(e.target.value) : undefined })} /></td>
                  <td className="p-2"><input className="border rounded px-2 py-1 w-32" value={it.brand||''} onChange={(e)=> updateItem(idx, { brand: e.target.value })} /></td>
                  <td className="p-2"><input type="number" className="border rounded px-2 py-1 w-20" value={it.qty} onChange={(e)=> updateItem(idx, { qty: Number(e.target.value)||1 })} /></td>
                </tr>
              ))}
              {items.length===0 && (
                <tr><td colSpan={8} className="p-4 text-center text-gray-500">أضف أسطرًا لطباعتها</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex gap-2">
          <button disabled={busy || items.length===0} onClick={genPreview} className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50">معاينة PDF</button>
          <button disabled={items.length===0} onClick={downloadZpl} className="px-3 py-2 rounded bg-emerald-600 text-white disabled:opacity-50">تنزيل ZPL</button>
        </div>
      </div>

      {previewUrl && (
        <div className="border rounded overflow-hidden h-[70vh]">
          <iframe src={previewUrl} className="w-full h-full" />
        </div>
      )}
    </main>
  );
}
