"use client";
import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

type Adjustment = {
  _id: string;
  lines: Array<{ sku: string; quantity: number; reason: string; note?: string }>;
  note?: string;
  postedAt: string;
  createdBy?: string;
};

export default function AdjustmentsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [items, setItems] = useState<Adjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sku, setSku] = useState('');
  const [qty, setQty] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [reasons, setReasons] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);
  const [onHand, setOnHand] = useState<number | null>(null);
  const [filters, setFilters] = useState<{ sku?: string; reason?: string; user?: string; dateFrom?: string; dateTo?: string }>({});

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/inventory/adjustments');
        const data = await res.json();
        setItems(data.adjustments || []);
        const res2 = await fetch('/api/settings/inventory');
        if (res2.ok) {
          const settings = await res2.json();
          setReasons(settings.reasons || []);
        }
      } catch (e: any) {
        setError(e?.message || 'خطأ');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      if (!sku) { setOnHand(null); return; }
      try {
        const url = new URL('/api/inventory/availability/bulk', window.location.origin);
        url.searchParams.set('skus', sku);
        const res = await fetch(url.toString(), { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          const a = (data.availability || []).find((x: any) => x.sku === sku);
          setOnHand(a ? a.onHand : 0);
        }
      } catch {}
    })();
    return () => controller.abort();
  }, [sku]);

  function exportCsv() {
    const rows: string[] = [];
    rows.push(['SKU','Quantity','Reason','User','Date','Note'].join(','));
    for (const a of items) {
      for (const l of a.lines) {
        rows.push([l.sku, String(l.quantity), l.reason || '', a.createdBy || '', new Date(a.postedAt).toISOString(), (l.note || a.note || '').replace(/\n/g,' ')].join(','));
      }
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `adjustments-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <main className="p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">التسويات</h1>
        <div className="flex gap-2">
          <a className="underline" href={`/${locale}/inventory/counts`}>الجرد الدوري</a>
          <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={exportCsv}>تصدير CSV</button>
        </div>
      </div>
      <div className="p-3 border rounded flex flex-wrap gap-2 items-end">
        <div className="flex flex-col">
          <label className="text-xs text-gray-600">SKU</label>
          <input className="border rounded px-2 py-1" placeholder="SKU/باركود" value={filters.sku || ''} onChange={(e) => setFilters({ ...filters, sku: e.target.value })} />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-600">السبب</label>
          <input className="border rounded px-2 py-1" placeholder="السبب" value={filters.reason || ''} onChange={(e) => setFilters({ ...filters, reason: e.target.value })} />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-600">المستخدم</label>
          <input className="border rounded px-2 py-1" placeholder="المستخدم" value={filters.user || ''} onChange={(e) => setFilters({ ...filters, user: e.target.value })} />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-600">من تاريخ</label>
          <input type="date" className="border rounded px-2 py-1" value={filters.dateFrom || ''} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-600">إلى تاريخ</label>
          <input type="date" className="border rounded px-2 py-1" value={filters.dateTo || ''} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} />
        </div>
        <button className="px-3 py-2 bg-gray-200 rounded" onClick={async () => {
          const url = new URL('/api/inventory/adjustments', window.location.origin);
          if (filters.sku) url.searchParams.set('sku', filters.sku);
          if (filters.reason) url.searchParams.set('reason', filters.reason);
          if (filters.user) url.searchParams.set('user', filters.user);
          if (filters.dateFrom) url.searchParams.set('dateFrom', String(new Date(filters.dateFrom).getTime()));
          if (filters.dateTo) url.searchParams.set('dateTo', String(new Date(filters.dateTo).getTime()));
          const res = await fetch(url.toString());
          if (res.ok) {
            const data = await res.json();
            setItems(data.adjustments || []);
          }
        }}>تطبيق التصفية</button>
      </div>
      <div className="p-3 border rounded flex flex-col gap-2">
        <div className="font-semibold">تسوية جديدة</div>
        <div className="flex flex-wrap gap-2 items-center">
          <input className="border rounded px-2 py-1" placeholder="SKU/باركود" value={sku} onChange={(e) => setSku(e.target.value)} />
          <input className="border rounded px-2 py-1 w-28" type="number" placeholder="الكمية ±" value={Number.isNaN(qty) ? '' : qty} onChange={(e) => setQty(Number(e.target.value))} />
          <select className="border rounded px-2 py-1" value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="">اختر السبب</option>
            {reasons.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <input className="border rounded px-2 py-1 flex-1" placeholder="ملاحظات" value={note} onChange={(e) => setNote(e.target.value)} />
          {onHand !== null && <div className="text-sm text-gray-700">على المخزون: {new Intl.NumberFormat(locale).format(onHand)}</div>}
          <button disabled={posting || !sku || !reason || !qty} className="px-3 py-2 bg-green-600 text-white rounded" onClick={async () => {
            setPosting(true);
            try {
              const res = await fetch('/api/inventory/adjustments', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `${Date.now()}-${Math.random()}` }, body: JSON.stringify({ lines: [{ sku, quantity: qty, reason, note }] }) });
              if (res.ok) {
                setSku(''); setQty(0); setReason(''); setNote('');
                const data = await (await fetch('/api/inventory/adjustments')).json();
                setItems(data.adjustments || []);
              }
            } finally { setPosting(false); }
          }}>حفظ</button>
        </div>
      </div>
      {loading ? <div>جارٍ التحميل...</div> : error ? <div className="text-red-600">{error}</div> : (
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-600">
                <th className="p-2 text-right">SKU</th>
                <th className="p-2 text-right">الكمية</th>
                <th className="p-2 text-right">السبب</th>
                <th className="p-2 text-right">المستخدم</th>
                <th className="p-2 text-right">التاريخ</th>
                <th className="p-2 text-right">ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {items.flatMap((a) => a.lines.map((l, idx) => (
                <tr key={`${a._id}-${idx}`} className="border-b">
                  <td className="p-2"><bdi dir="ltr">{l.sku}</bdi></td>
                  <td className="p-2">{new Intl.NumberFormat(locale).format(l.quantity)}</td>
                  <td className="p-2">{l.reason}</td>
                  <td className="p-2">{a.createdBy || ''}</td>
                  <td className="p-2">{new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(a.postedAt))}</td>
                  <td className="p-2">{l.note || a.note || ''}</td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}


