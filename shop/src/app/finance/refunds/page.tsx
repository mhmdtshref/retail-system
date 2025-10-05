"use client";
import { useEffect, useMemo, useState } from 'react';

type Refund = {
  _id: string;
  origin: { type: 'return'|'exchange'|'sale_adjustment'|'manual'; refId?: string };
  customerId?: string;
  method: 'cash'|'card'|'transfer'|'store_credit';
  amount: number;
  status: 'pending'|'confirmed'|'failed';
  createdAt: number;
  notes?: string;
};

export default function RefundsPage() {
  const [list, setList] = useState<Refund[]>([]);
  const [method, setMethod] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [customerId, setCustomerId] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  async function load() {
    const params = new URLSearchParams();
    if (method) params.set('method', method);
    if (status) params.set('status', status);
    if (customerId) params.set('customerId', customerId);
    if (dateFrom) params.set('dateFrom', String(Date.parse(dateFrom)));
    if (dateTo) params.set('dateTo', String(Date.parse(dateTo)));
    const res = await fetch(`/api/refunds?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setList(data.results || []);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => list, [list]);

  return (
    <main className="p-4" dir="rtl">
      <h1 className="text-xl font-semibold mb-3">سجل الاستردادات</h1>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
        <select value={method} onChange={(e)=> setMethod(e.target.value)} className="border rounded px-2 py-1">
          <option value="">الطريقة (الكل)</option>
          <option value="cash">نقدًا</option>
          <option value="card">بطاقة</option>
          <option value="transfer">حوالة</option>
          <option value="store_credit">رصيد متجر</option>
        </select>
        <select value={status} onChange={(e)=> setStatus(e.target.value)} className="border rounded px-2 py-1">
          <option value="">الحالة (الكل)</option>
          <option value="pending">قيد الانتظار</option>
          <option value="confirmed">مؤكد</option>
          <option value="failed">فشل</option>
        </select>
        <input value={customerId} onChange={(e)=> setCustomerId(e.target.value)} placeholder="العميل (ID)" dir="ltr" className="border rounded px-2 py-1" />
        <input type="date" value={dateFrom} onChange={(e)=> setDateFrom(e.target.value)} className="border rounded px-2 py-1" />
        <input type="date" value={dateTo} onChange={(e)=> setDateTo(e.target.value)} className="border rounded px-2 py-1" />
        <button onClick={load} className="px-3 py-1 rounded bg-black text-white">تصفية</button>
      </div>

      <div className="overflow-auto border rounded">
        <table className="w-full text-right text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-2">التاريخ</th>
              <th className="p-2">العميل</th>
              <th className="p-2">الأصل</th>
              <th className="p-2">الطريقة</th>
              <th className="p-2">المبلغ</th>
              <th className="p-2">الحالة</th>
              <th className="p-2">ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r._id} className="border-t">
                <td className="p-2">{new Date(r.createdAt).toLocaleString('ar-SA')}</td>
                <td className="p-2"><bdi dir="ltr">{r.customerId || '—'}</bdi></td>
                <td className="p-2">{r.origin.type}{r.origin.refId ? ` / ${r.origin.refId.slice(-6)}` : ''}</td>
                <td className="p-2">{r.method === 'store_credit' ? 'رصيد المتجر' : r.method}</td>
                <td className="p-2">{r.amount.toLocaleString('ar-SA')}</td>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <span>{r.status}</span>
                    {r.status === 'pending' && (
                      <>
                        <button className="text-xs px-2 py-1 rounded bg-emerald-600 text-white" onClick={async ()=> { await fetch(`/api/refunds/${r._id}/confirm`, { method: 'POST' }); await load(); }}>تأكيد</button>
                        <button className="text-xs px-2 py-1 rounded bg-red-600 text-white" onClick={async ()=> { await fetch(`/api/refunds/${r._id}/void`, { method: 'POST' }); await load(); }}>إبطال</button>
                      </>
                    )}
                  </div>
                </td>
                <td className="p-2">{r.notes || '—'}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="p-3 text-center text-gray-500">لا نتائج</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}


