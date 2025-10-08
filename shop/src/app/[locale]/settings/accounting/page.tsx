"use client";
import { useEffect, useState } from 'react';

type Accounts = {
  sales: string; returns: string; discounts: string; taxPayable: string; rounding: string; cogs: string; inventory: string;
  cash: string; cardClearing: string; transfer: string; codClearing: string; storeCreditLiability: string; storeCreditExpense?: string;
  ar?: string; layawayAr?: string; inventoryGainLoss?: string;
};

export default function AccountingSettingsPage() {
  const [role, setRole] = useState<string>('viewer');
  const [data, setData] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/self');
        if (res.ok) {
          const j = await res.json();
          setRole(j?.user?.role || 'viewer');
        }
      } catch {}
      try {
        const res = await fetch('/api/accounting/settings');
        if (res.ok) setData(await res.json());
      } catch {}
    })();
  }, []);

  const canEdit = role === 'owner' || role === 'manager';

  async function save() {
    if (!canEdit) return;
    setSaving(true);
    try {
      const res = await fetch('/api/accounting/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (res.ok) setData(await res.json());
    } catch {}
    setSaving(false);
  }

  if (!data) return <main className="p-4">...تحميل</main>;
  if (!canEdit) return <main className="p-4"><div className="rounded border p-4 text-rose-700">مرفوض: يتطلب صلاحيات مدير</div></main>;

  function setAcc<K extends keyof Accounts>(k: K, v: string) {
    setData((d: any) => ({ ...d, accounts: { ...d.accounts, [k]: v } }));
  }

  return (
    <main className="p-4 flex flex-col gap-3 rtl">
      <h1 className="text-lg font-semibold">إعدادات المحاسبة</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="border rounded p-3">
          <div className="flex gap-2">
            <label className="w-40">الموفر</label>
            <select value={data.provider} onChange={(e)=> setData({ ...data, provider: e.target.value })} className="border rounded px-2 py-1">
              <option value="generic_csv">Generic CSV</option>
              <option value="quickbooks_csv">QuickBooks CSV</option>
              <option value="xero_csv">Xero CSV</option>
            </select>
          </div>
          <div className="flex gap-2 mt-2">
            <label className="w-40">منطقة زمنية</label>
            <input value={data.tz} onChange={(e)=> setData({ ...data, tz: e.target.value })} className="border rounded px-2 py-1 w-full" />
          </div>
          <div className="flex gap-2 mt-2">
            <label className="w-40">عملة الأساس</label>
            <input value={data.baseCurrency} onChange={(e)=> setData({ ...data, baseCurrency: e.target.value })} className="border rounded px-2 py-1 w-full" />
          </div>
          <div className="flex gap-2 mt-2">
            <label className="w-40">المستوى</label>
            <select value={data.consolidation} onChange={(e)=> setData({ ...data, consolidation: e.target.value })} className="border rounded px-2 py-1">
              <option value="daily_summary">تجميع يومي</option>
              <option value="per_receipt">لكل إيصال</option>
            </select>
          </div>
          <div className="flex gap-2 mt-2">
            <label className="w-40">تاريخ الأساس</label>
            <select value={data.dateBasis} onChange={(e)=> setData({ ...data, dateBasis: e.target.value })} className="border rounded px-2 py-1">
              <option value="order_date">تاريخ الطلب</option>
              <option value="payment_date">تاريخ الدفع</option>
            </select>
          </div>
        </div>
        <div className="border rounded p-3">
          <h2 className="font-semibold mb-2">ربط الحسابات</h2>
          {Object.entries(data.accounts || {}).map(([k,v]: any) => (
            <div key={k} className="flex gap-2 mt-2">
              <label className="w-56">{k}</label>
              <input value={v || ''} onChange={(e)=> setAcc(k as any, e.target.value)} className="border rounded px-2 py-1 w-full" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="px-3 py-1 border rounded disabled:opacity-50">حفظ</button>
        <a className="px-3 py-1 border rounded" href="/api/accounting/sample/quickbooks_csv" target="_blank" rel="noopener noreferrer">تنزيل مثال QBO</a>
        <a className="px-3 py-1 border rounded" href="/api/accounting/sample/xero_csv" target="_blank" rel="noopener noreferrer">تنزيل مثال Xero</a>
      </div>
    </main>
  );
}

