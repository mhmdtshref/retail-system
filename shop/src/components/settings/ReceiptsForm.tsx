"use client";
import { useEffect, useMemo, useState } from 'react';
import { ReceiptPreview } from './ReceiptPreview';

type ReceiptTemplate = {
  showLogo: boolean;
  showReceiptBarcode: boolean;
  showTaxSummary: boolean;
  showCashier: boolean;
  showCustomer: boolean;
  showReturnPolicy: boolean;
  showStoreCredit: boolean;
  labels: Record<string,string>;
  header: { ar?: string; en?: string };
  footer: { ar?: string; en?: string };
};

type ReceiptsConfig = {
  thermal80: ReceiptTemplate;
  a4: ReceiptTemplate;
};

export function ReceiptsForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [online, setOnline] = useState(true);
  const [template, setTemplate] = useState<'thermal80'|'a4'>('thermal80');
  const [conf, setConf] = useState<ReceiptsConfig>({
    thermal80: { showLogo: true, showReceiptBarcode: true, showTaxSummary: true, showCashier: true, showCustomer: true, showReturnPolicy: false, showStoreCredit: true, labels: {}, header: {}, footer: {} },
    a4: { showLogo: true, showReceiptBarcode: true, showTaxSummary: true, showCashier: true, showCustomer: true, showReturnPolicy: false, showStoreCredit: true, labels: {}, header: {}, footer: {} }
  });

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/settings/receipts');
        if (res.ok) {
          const data = await res.json();
          setConf({ ...conf, ...data });
        }
      } finally { setLoading(false); }
    })();
  }, []);

  async function save() {
    if (!online) return alert('يتطلب هذا الإجراء اتصالاً بالإنترنت.');
    setSaving(true);
    try {
      const idk = Math.random().toString(36).slice(2);
      const csrf = document.cookie.split('; ').find(c=>c.startsWith('csrf-token='))?.split('=')[1] || '';
      const res = await fetch('/api/settings/receipts', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idk, 'X-CSRF-Token': csrf }, body: JSON.stringify(conf) });
      if (res.ok) {
        try { const { refreshSettingsConfig } = await import('@/lib/tax/cache'); await refreshSettingsConfig(); } catch {}
        alert('تم الحفظ');
      } else {
        const e = await res.json(); console.error(e); alert('فشل الحفظ');
      }
    } finally { setSaving(false); }
  }

  const mockReceipt = useMemo(() => ({
    localSaleId: 'local-1', createdAt: Date.now(),
    lines: [ { sku: 'SKU1', name: 'قميص', price: 50, qty: 1 } ],
    payments: [ { method: 'cash', amount: 50, seq: 1 } ],
    totals: { subtotal: 50, tax: 7.5, grand: 57.5, discountValue: 0, roundingAdj: 0 },
  } as any), []);

  if (loading) return <div>...تحميل</div>;

  const tpl = conf[template];

  const boolToggle = (key: keyof ReceiptTemplate) => (
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!(tpl as any)[key]} onChange={(e)=> setConf((c)=> ({ ...c, [template]: { ...(c as any)[template], [key]: e.target.checked } }))} />{key}</label>
  );

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="space-y-3">
        <div className="p-3 border rounded space-y-2">
          <div className="font-semibold">القالب</div>
          <div className="flex items-center gap-2">
            <button className={`px-3 py-1 rounded border ${template==='thermal80'?'bg-emerald-50 border-emerald-300':''}`} onClick={()=> setTemplate('thermal80')}>حراري 80مم</button>
            <button className={`px-3 py-1 rounded border ${template==='a4'?'bg-emerald-50 border-emerald-300':''}`} onClick={()=> setTemplate('a4')}>A4</button>
          </div>
        </div>

        <div className="p-3 border rounded space-y-2">
          <div className="font-semibold">العناصر الظاهرة</div>
          <div className="grid grid-cols-2 gap-2">
            {boolToggle('showLogo')}
            {boolToggle('showReceiptBarcode')}
            {boolToggle('showTaxSummary')}
            {boolToggle('showCashier')}
            {boolToggle('showCustomer')}
            {boolToggle('showReturnPolicy')}
            {boolToggle('showStoreCredit')}
          </div>
        </div>

        <div className="p-3 border rounded space-y-2">
          <div className="font-semibold">الترويسة (ع/En)</div>
          <textarea className="border rounded p-2 min-h-[80px]" value={tpl.header?.ar || ''} onChange={(e)=> setConf((c)=> ({ ...c, [template]: { ...(c as any)[template], header: { ...((c as any)[template]?.header||{}), ar: e.target.value } } }))} />
          <textarea className="border rounded p-2 min-h-[80px]" dir="ltr" value={tpl.header?.en || ''} onChange={(e)=> setConf((c)=> ({ ...c, [template]: { ...(c as any)[template], header: { ...((c as any)[template]?.header||{}), en: e.target.value } } }))} />
        </div>

        <div className="p-3 border rounded space-y-2">
          <div className="font-semibold">التذييل (ع/En)</div>
          <textarea className="border rounded p-2 min-h-[80px]" value={tpl.footer?.ar || ''} onChange={(e)=> setConf((c)=> ({ ...c, [template]: { ...(c as any)[template], footer: { ...((c as any)[template]?.footer||{}), ar: e.target.value } } }))} />
          <textarea className="border rounded p-2 min-h-[80px]" dir="ltr" value={tpl.footer?.en || ''} onChange={(e)=> setConf((c)=> ({ ...c, [template]: { ...(c as any)[template], footer: { ...((c as any)[template]?.footer||{}), en: e.target.value } } }))} />
        </div>

        <div className="p-3 border rounded space-y-2">
          <div className="font-semibold">العناوين المخصصة</div>
          {['subtotal','discounts','tax','rounding','total','paid','change','balance'].map((k) => (
            <div key={k} className="grid grid-cols-3 gap-2 items-center">
              <div className="text-xs text-neutral-600">{k}</div>
              <input value={tpl.labels?.[`${k}.ar`] || ''} onChange={(e)=> setConf((c)=> ({ ...c, [template]: { ...(c as any)[template], labels: { ...((c as any)[template]?.labels||{}), [`${k}.ar`]: e.target.value } } }))} className="border rounded px-2 py-1" placeholder="عربية" />
              <input value={tpl.labels?.[`${k}.en`] || ''} onChange={(e)=> setConf((c)=> ({ ...c, [template]: { ...(c as any)[template], labels: { ...((c as any)[template]?.labels||{}), [`${k}.en`]: e.target.value } } }))} className="border rounded px-2 py-1" dir="ltr" placeholder="English" />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button disabled={!online || saving} onClick={save} className={`px-4 py-2 rounded ${(!online||saving)?'bg-gray-200 text-gray-500':'bg-blue-600 text-white'}`}>حفظ</button>
          {!online && <span className="text-xs text-neutral-600">يتطلب هذا الإجراء اتصالاً بالإنترنت.</span>}
        </div>
      </div>

      <div>
        <div className="font-semibold mb-2">المعاينة</div>
        <ReceiptPreview data={mockReceipt} template={template} />
      </div>
    </div>
  );
}

