"use client";
import { useEffect, useMemo, useState } from 'react';

export default function TaxSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cfg, setCfg] = useState<any>(null);
  const [curr, setCurr] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const [tres, cres] = await Promise.all([
          fetch('/api/settings/tax'),
          fetch('/api/settings/currency')
        ]);
        if (tres.ok) setCfg(await tres.json());
        if (cres.ok) setCurr(await cres.json());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const preview = useMemo(() => {
    try {
      const nf = new Intl.NumberFormat(curr?.displayLocale || 'ar-SA', { style: 'currency', currency: curr?.defaultCurrency || 'SAR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return nf.format(1234.56);
    } catch { return '١٬٢٣٤٫٥٦ ر.س'; }
  }, [curr]);

  async function save() {
    setSaving(true);
    try {
      await fetch('/api/settings/tax', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `tax:${Date.now()}` }, body: JSON.stringify(cfg) });
      await fetch('/api/settings/currency', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `cur:${Date.now()}` }, body: JSON.stringify(curr) });
      alert('تم الحفظ');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-4">...</div>;

  return (
    <main className="p-4 space-y-4" dir="rtl">
      <h1 className="text-xl font-semibold">الضرائب والعملات</h1>

      <div className="border rounded p-3 space-y-2">
        <div className="font-medium">وضع الأسعار</div>
        <div className="flex gap-2">
          <label className="inline-flex items-center gap-1"><input type="radio" checked={cfg?.priceMode==='tax_inclusive'} onChange={()=> setCfg((c:any)=> ({ ...c, priceMode: 'tax_inclusive' }))} /> شامل الضريبة</label>
          <label className="inline-flex items-center gap-1"><input type="radio" checked={cfg?.priceMode==='tax_exclusive'} onChange={()=> setCfg((c:any)=> ({ ...c, priceMode: 'tax_exclusive' }))} /> غير شامل الضريبة</label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-sm">النسبة الافتراضية (%)
            <input className="w-full border rounded px-2 py-1" type="number" dir="ltr" value={(cfg?.defaultRate||0)*100} onChange={(e)=> setCfg((c:any)=> ({ ...c, defaultRate: Math.max(0, Number(e.target.value))/100 }))} />
          </label>
          <label className="text-sm">الدقة (خانات عشرية)
            <input className="w-full border rounded px-2 py-1" type="number" dir="ltr" value={cfg?.precision||2} onChange={(e)=> setCfg((c:any)=> ({ ...c, precision: Math.max(0, Number(e.target.value)) }))} />
          </label>
          <label className="text-sm">تقريب السطر/الفاتورة
            <select className="w-full border rounded px-2 py-1" value={cfg?.receiptRounding||'none'} onChange={(e)=> setCfg((c:any)=> ({ ...c, receiptRounding: e.target.value }))}>
              <option value="none">تقريب على مستوى السطر</option>
              <option value="half_up">تقريب الفاتورة (Half-up)</option>
              <option value="bankers">تقريب الفاتورة (Bankers)</option>
            </select>
          </label>
          <label className="text-sm">طريقة التقريب
            <select className="w-full border rounded px-2 py-1" value={cfg?.roundingStrategy||'half_up'} onChange={(e)=> setCfg((c:any)=> ({ ...c, roundingStrategy: e.target.value }))}>
              <option value="half_up">Half-up</option>
              <option value="bankers">Bankers</option>
            </select>
          </label>
          <label className="text-sm">تقريب النقد
            <select className="w-full border rounded px-2 py-1" value={cfg?.cashRounding?.increment || 0.05} onChange={(e)=> setCfg((c:any)=> ({ ...c, cashRounding: { enabled: true, increment: Number(e.target.value) } }))}>
              <option value={0.05}>0.05</option>
              <option value={0.1}>0.10</option>
            </select>
          </label>
        </div>
      </div>

      <div className="border rounded p-3 space-y-2">
        <div className="font-medium">العملة</div>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-sm">العملة الافتراضية
            <input className="w-full border rounded px-2 py-1" value={curr?.defaultCurrency || 'SAR'} onChange={(e)=> setCurr((c:any)=> ({ ...c, defaultCurrency: e.target.value }))} />
          </label>
          <label className="text-sm">اللغة/المنطقة للعرض
            <input className="w-full border rounded px-2 py-1" value={curr?.displayLocale || 'ar-SA'} onChange={(e)=> setCurr((c:any)=> ({ ...c, displayLocale: e.target.value }))} />
          </label>
        </div>
        <div className="text-sm">معاينة: <span dir="ltr">{preview}</span></div>
      </div>

      <div className="flex gap-2">
        <button disabled={saving} onClick={save} className="px-3 py-2 bg-blue-600 text-white rounded">حفظ</button>
      </div>
    </main>
  );
}
