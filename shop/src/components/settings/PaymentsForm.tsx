"use client";
import { useEffect, useMemo, useState } from 'react';

type PaymentRules = {
  enabledMethods: Array<'cash'|'card'|'transfer'|'store_credit'|'cod'|'partial'>;
  partial?: { enabled: boolean; minUpfrontPct: number; maxDays: number; autoCancel: boolean };
  cashierManualDiscountLimitPct: number;
  drawer: { openOnCashSale: boolean; openOnRefund: boolean; allowNoSale: boolean; requireEndShiftCount: boolean };
  cash: { allowChange: boolean; roundingIncrement?: 0.05|0.10|null };
  card: { requireLast4?: boolean; requireRef?: boolean };
  transfer: { requireRef?: boolean };
};

export function PaymentsForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [online, setOnline] = useState(true);
  const [rules, setRules] = useState<PaymentRules>({
    enabledMethods: ['cash','card','transfer','store_credit'],
    partial: { enabled: false, minUpfrontPct: 10, maxDays: 30, autoCancel: false },
    cashierManualDiscountLimitPct: 10,
    drawer: { openOnCashSale: true, openOnRefund: true, allowNoSale: false, requireEndShiftCount: true },
    cash: { allowChange: true, roundingIncrement: null },
    card: { requireLast4: false, requireRef: false },
    transfer: { requireRef: true }
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
        const res = await fetch('/api/settings/payments');
        if (res.ok) {
          const data = await res.json();
          setRules({ ...rules, ...data });
        }
      } finally { setLoading(false); }
    })();
  }, []);

  const toggleMethod = (m: PaymentRules['enabledMethods'][number]) => {
    setRules((r) => ({ ...r, enabledMethods: r.enabledMethods.includes(m) ? r.enabledMethods.filter((x) => x !== m) : [...r.enabledMethods, m] }));
  };

  async function save() {
    if (!online) return alert('يتطلب هذا الإجراء اتصالاً بالإنترنت.');
    setSaving(true);
    try {
      const idk = Math.random().toString(36).slice(2);
      const res = await fetch('/api/settings/payments', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idk }, body: JSON.stringify(rules) });
      if (res.ok) {
        // refresh settings cache silently
        try { const { refreshSettingsConfig } = await import('@/lib/tax/cache'); await refreshSettingsConfig(); } catch {}
        // toast
        alert('تم الحفظ');
      } else {
        const e = await res.json();
        alert('فشل الحفظ');
        console.error(e);
      }
    } finally { setSaving(false); }
  }

  if (loading) return <div>...تحميل</div>;

  const methodLabel: Record<string, string> = { cash: 'نقدًا', card: 'بطاقة', transfer: 'حوالة', store_credit: 'رصيد المتجر', cod: 'الدفع عند التسليم', partial: 'تقسيط' };

  return (
    <div className="p-3 border rounded space-y-4">
      <div className="font-semibold">طرق الدفع المسموحة</div>
      <div className="flex flex-wrap gap-2">
        {(['cash','card','transfer','store_credit','cod','partial'] as const).map((m) => (
          <label key={m} className={`px-3 py-1 rounded border cursor-pointer select-none ${rules.enabledMethods.includes(m)?'bg-emerald-50 border-emerald-300':''}`}>
            <input className="me-2" type="checkbox" checked={rules.enabledMethods.includes(m)} onChange={() => toggleMethod(m)} />{methodLabel[m]}
          </label>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="p-3 rounded border space-y-2">
          <div className="font-semibold">سياسة التقسيط/الحجز</div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!rules.partial?.enabled} onChange={(e)=> setRules((r)=> ({ ...r, partial: { ...(r.partial||{}), enabled: e.target.checked, minUpfrontPct: r.partial?.minUpfrontPct ?? 10, maxDays: r.partial?.maxDays ?? 30, autoCancel: r.partial?.autoCancel ?? false } }))} />تفعيل التقسيط</label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-xs">الدفعة الأدنى %</div>
              <input type="number" dir="ltr" value={rules.partial?.minUpfrontPct ?? 10} onChange={(e)=> setRules((r)=> ({ ...r, partial: { ...(r.partial||{ enabled: false, minUpfrontPct: 10, maxDays: 30, autoCancel: false }), enabled: r.partial?.enabled ?? false, minUpfrontPct: Number(e.target.value) } }))} className="w-full border rounded px-2 py-1" />
            </div>
            <div>
              <div className="text-xs">المدة القصوى (أيام)</div>
              <input type="number" dir="ltr" value={rules.partial?.maxDays ?? 30} onChange={(e)=> setRules((r)=> ({ ...r, partial: { ...(r.partial||{ enabled: false, minUpfrontPct: 10, maxDays: 30, autoCancel: false }), enabled: r.partial?.enabled ?? false, maxDays: Number(e.target.value) } }))} className="w-full border rounded px-2 py-1" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!rules.partial?.autoCancel} onChange={(e)=> setRules((r)=> ({ ...r, partial: { ...(r.partial||{ enabled: false, minUpfrontPct: 10, maxDays: 30, autoCancel: false }), enabled: r.partial?.enabled ?? false, autoCancel: e.target.checked } }))} />إلغاء تلقائي بعد انتهاء المدة</label>
        </div>

        <div className="p-3 rounded border space-y-2">
          <div className="font-semibold">حد الخصم اليدوي للكاشير</div>
          <input type="number" dir="ltr" value={rules.cashierManualDiscountLimitPct} onChange={(e)=> setRules((r)=> ({ ...r, cashierManualDiscountLimitPct: Number(e.target.value) }))} className="w-full border rounded px-2 py-1" />
          <div className="text-xs text-neutral-600">يتطلب تجاوز الحد موافقة المدير</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="p-3 rounded border space-y-2">
          <div className="font-semibold">درج النقود</div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={rules.drawer.openOnCashSale} onChange={(e)=> setRules((r)=> ({ ...r, drawer: { ...r.drawer, openOnCashSale: e.target.checked } }))} />فتح عند بيع نقدي</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={rules.drawer.openOnRefund} onChange={(e)=> setRules((r)=> ({ ...r, drawer: { ...r.drawer, openOnRefund: e.target.checked } }))} />فتح عند استرداد</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={rules.drawer.allowNoSale} onChange={(e)=> setRules((r)=> ({ ...r, drawer: { ...r.drawer, allowNoSale: e.target.checked } }))} />فتح بدون بيع (يتطلب إذن)</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={rules.drawer.requireEndShiftCount} onChange={(e)=> setRules((r)=> ({ ...r, drawer: { ...r.drawer, requireEndShiftCount: e.target.checked } }))} />إلزام جرد نهاية الوردية</label>
        </div>

        <div className="p-3 rounded border space-y-2">
          <div className="font-semibold">سياسة النقد</div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={rules.cash.allowChange} onChange={(e)=> setRules((r)=> ({ ...r, cash: { ...r.cash, allowChange: e.target.checked } }))} />السماح بالباقي</label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-xs">تقريب النقد</div>
              <select value={String(rules.cash.roundingIncrement ?? '')} onChange={(e)=> setRules((r)=> ({ ...r, cash: { ...r.cash, roundingIncrement: (e.target.value ? Number(e.target.value) : null) as any } }))} className="w-full border rounded px-2 py-1" dir="ltr">
                <option value="">—</option>
                <option value="0.05">0.05</option>
                <option value="0.1">0.10</option>
              </select>
            </div>
          </div>
          <div className="font-semibold mt-2">بطاقة/حوالة</div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!rules.card?.requireLast4} onChange={(e)=> setRules((r)=> ({ ...r, card: { ...(r.card||{}), requireLast4: e.target.checked } }))} />طلب آخر 4 أرقام</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!rules.card?.requireRef} onChange={(e)=> setRules((r)=> ({ ...r, card: { ...(r.card||{}), requireRef: e.target.checked } }))} />طلب مرجع العملية</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!rules.transfer?.requireRef} onChange={(e)=> setRules((r)=> ({ ...r, transfer: { ...(r.transfer||{}), requireRef: e.target.checked } }))} />طلب مرجع الحوالة</label>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button disabled={!online || saving} onClick={save} className={`px-4 py-2 rounded ${(!online||saving)?'bg-gray-200 text-gray-500':'bg-blue-600 text-white'}`}>حفظ</button>
        {!online && <span className="text-xs text-neutral-600">يتطلب هذا الإجراء اتصالاً بالإنترنت.</span>}
      </div>
    </div>
  );
}

