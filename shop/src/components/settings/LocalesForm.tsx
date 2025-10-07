"use client";
import { useEffect, useMemo, useState } from 'react';

type LocalesConfig = {
  defaultLang: 'ar'|'en';
  rtlByLang: { ar: boolean; en: boolean };
  currency: string;
  displayLocale: string;
  dateFormat: string;
  timeFormat: '12h'|'24h';
  shopInfo: { name_ar: string; name_en?: string; phone?: string; taxNumber?: string; address_ar?: string; address_en?: string };
};

export function LocalesForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [online, setOnline] = useState(true);
  const [conf, setConf] = useState<LocalesConfig>({ defaultLang: 'ar', rtlByLang: { ar: true, en: false }, currency: 'SAR', displayLocale: 'ar-SA', dateFormat: 'dd/MM/yyyy', timeFormat: '12h', shopInfo: { name_ar: '' } });

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
        const res = await fetch('/api/settings/locales');
        if (res.ok) {
          const data = await res.json();
          setConf({ ...conf, ...data });
        }
      } finally { setLoading(false); }
    })();
  }, []);

  const numberPreview = useMemo(() => {
    try { return new Intl.NumberFormat(conf.displayLocale, { style: 'currency', currency: conf.currency || 'SAR' }).format(12345.67); } catch { return '12345.67'; }
  }, [conf.displayLocale, conf.currency]);

  const datePreview = useMemo(() => {
    try { return new Intl.DateTimeFormat(conf.displayLocale, { dateStyle: 'medium', timeStyle: conf.timeFormat === '12h' ? 'short' : 'medium', hour12: conf.timeFormat === '12h' }).format(new Date('2025-03-15T13:45:00Z')); } catch { return '15/03/2025 1:45 PM'; }
  }, [conf.displayLocale, conf.timeFormat]);

  async function save() {
    if (!online) return alert('يتطلب هذا الإجراء اتصالاً بالإنترنت.');
    setSaving(true);
    try {
      const idk = Math.random().toString(36).slice(2);
      const res = await fetch('/api/settings/locales', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idk }, body: JSON.stringify(conf) });
      if (res.ok) {
        // refresh cached settings
        try { const { refreshSettingsConfig } = await import('@/lib/tax/cache'); await refreshSettingsConfig(); } catch {}
        alert('تم الحفظ');
      } else {
        const e = await res.json(); console.error(e); alert('فشل الحفظ');
      }
    } finally { setSaving(false); }
  }

  if (loading) return <div>...تحميل</div>;

  return (
    <div className="p-3 border rounded space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="p-3 rounded border space-y-2">
          <div className="font-semibold">اللغة والاتجاه</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-xs">اللغة الافتراضية</div>
              <select value={conf.defaultLang} onChange={(e)=> setConf((c)=> ({ ...c, defaultLang: e.target.value as any }))} className="w-full border rounded px-2 py-1">
                <option value="ar">العربية</option>
                <option value="en">English</option>
              </select>
            </div>
            <div>
              <div className="text-xs">المحلية (Intl)</div>
              <input value={conf.displayLocale} onChange={(e)=> setConf((c)=> ({ ...c, displayLocale: e.target.value }))} className="w-full border rounded px-2 py-1" dir="ltr" placeholder="ar-SA" />
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={conf.rtlByLang.ar} onChange={(e)=> setConf((c)=> ({ ...c, rtlByLang: { ...c.rtlByLang, ar: e.target.checked } }))} />RTL للعربية</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={conf.rtlByLang.en} onChange={(e)=> setConf((c)=> ({ ...c, rtlByLang: { ...c.rtlByLang, en: e.target.checked } }))} />RTL للإنجليزية</label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-xs">تنسيق التاريخ</div>
              <input value={conf.dateFormat} onChange={(e)=> setConf((c)=> ({ ...c, dateFormat: e.target.value }))} className="w-full border rounded px-2 py-1" placeholder="dd/MM/yyyy" />
            </div>
            <div>
              <div className="text-xs">الوقت</div>
              <select value={conf.timeFormat} onChange={(e)=> setConf((c)=> ({ ...c, timeFormat: e.target.value as any }))} className="w-full border rounded px-2 py-1">
                <option value="12h">12 ساعة</option>
                <option value="24h">24 ساعة</option>
              </select>
            </div>
          </div>
        </div>

        <div className="p-3 rounded border space-y-2">
          <div className="font-semibold">العملة والتنسيق</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-xs">رمز العملة</div>
              <input value={conf.currency} onChange={(e)=> setConf((c)=> ({ ...c, currency: e.target.value.toUpperCase() }))} className="w-full border rounded px-2 py-1" dir="ltr" placeholder="SAR" />
            </div>
            <div>
              <div className="text-xs">معاينة</div>
              <div className="border rounded px-2 py-1 bg-neutral-50" dir="ltr">{numberPreview}</div>
            </div>
          </div>
          <div>
            <div className="text-xs">تاريخ/وقت (Intl)</div>
            <div className="border rounded px-2 py-1 bg-neutral-50" dir="ltr">{datePreview}</div>
          </div>
        </div>
      </div>

      <div className="p-3 rounded border space-y-2">
        <div className="font-semibold">معلومات المتجر</div>
        <div className="grid md:grid-cols-2 gap-2">
          <div>
            <div className="text-xs">اسم المتجر (ع)</div>
            <input value={conf.shopInfo.name_ar} onChange={(e)=> setConf((c)=> ({ ...c, shopInfo: { ...c.shopInfo, name_ar: e.target.value } }))} className="w-full border rounded px-2 py-1" />
          </div>
          <div>
            <div className="text-xs">اسم المتجر (E)</div>
            <input value={conf.shopInfo.name_en || ''} onChange={(e)=> setConf((c)=> ({ ...c, shopInfo: { ...c.shopInfo, name_en: e.target.value } }))} className="w-full border rounded px-2 py-1" dir="ltr" />
          </div>
          <div>
            <div className="text-xs">الهاتف</div>
            <input value={conf.shopInfo.phone || ''} onChange={(e)=> setConf((c)=> ({ ...c, shopInfo: { ...c.shopInfo, phone: e.target.value } }))} className="w-full border rounded px-2 py-1" dir="ltr" />
          </div>
          <div>
            <div className="text-xs">الرقم الضريبي</div>
            <input value={conf.shopInfo.taxNumber || ''} onChange={(e)=> setConf((c)=> ({ ...c, shopInfo: { ...c.shopInfo, taxNumber: e.target.value } }))} className="w-full border rounded px-2 py-1" dir="ltr" />
          </div>
          <div>
            <div className="text-xs">العنوان (ع)</div>
            <input value={conf.shopInfo.address_ar || ''} onChange={(e)=> setConf((c)=> ({ ...c, shopInfo: { ...c.shopInfo, address_ar: e.target.value } }))} className="w-full border rounded px-2 py-1" />
          </div>
          <div>
            <div className="text-xs">العنوان (E)</div>
            <input value={conf.shopInfo.address_en || ''} onChange={(e)=> setConf((c)=> ({ ...c, shopInfo: { ...c.shopInfo, address_en: e.target.value } }))} className="w-full border rounded px-2 py-1" dir="ltr" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button disabled={!online || saving} onClick={save} className={`px-4 py-2 rounded ${(!online||saving)?'bg-gray-200 text-gray-500':'bg-blue-600 text-white'}`}>حفظ</button>
        {!online && <span className="text-xs text-neutral-600">يتطلب هذا الإجراء اتصالاً بالإنترنت.</span>}
      </div>
    </div>
  );
}

