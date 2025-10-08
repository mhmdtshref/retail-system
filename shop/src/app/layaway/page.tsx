"use client";
import { useEffect, useState, useMemo } from 'react';
import { getCachedLayawayRows, cacheLayawayRows } from '@/lib/offline/layaway-cache';

type Row = { _id?: string; code?: string; customerId?: string; customerName?: string; phone?: string; totals?: { grandTotal: number; upfrontPaid: number; balance: number }; dueAt: string; status: string };

export default function LayawayDashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const handle = () => setOffline(!navigator.onLine);
    handle();
    window.addEventListener('online', handle);
    window.addEventListener('offline', handle);
    return () => { window.removeEventListener('online', handle); window.removeEventListener('offline', handle); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!navigator.onLine) {
        const cached = await getCachedLayawayRows();
        if (!cancelled) setRows(cached as any);
        return;
      }
      try {
        const res = await fetch('/api/layaway');
        if (res.ok) {
          const data = await res.json();
          const list: Row[] = (data.items || []);
          setRows(list);
          await cacheLayawayRows(list.map((d: any) => ({ id: d._id, customerName: d.customerName, phone: d.phone, total: d.totals?.grandTotal, paid: (d.totals?.upfrontPaid || 0) + (d.payments || []).reduce((s: number, p: any)=> s + (p.amount||0), 0), balance: d.totals?.balance, dueAt: d.dueAt, status: d.status, bucket: undefined })));
        } else {
          const cached = await getCachedLayawayRows();
          setRows(cached as any);
        }
      } catch {
        const cached = await getCachedLayawayRows();
        if (!cancelled) setRows(cached as any);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <main className="p-4" dir="rtl">
      {offline && (
        <div className="rounded bg-yellow-100 text-yellow-900 p-2 text-sm mb-3">عرض بيانات مخزنة مؤقتًا</div>
      )}
      <h1 className="text-xl font-semibold mb-3">حجوزات/تقسيط</h1>
      <div className="rounded border overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="p-2 text-right">العميل</th>
              <th className="p-2">المبلغ الإجمالي</th>
              <th className="p-2">المدفوع</th>
              <th className="p-2">المتبقي</th>
              <th className="p-2">تاريخ الاستحقاق</th>
              <th className="p-2">الحالة</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => {
              const paid = (r.totals?.upfrontPaid || 0);
              return (
                <tr key={r._id || r.id} className="border-t">
                  <td className="p-2">{r.customerName || r.customerId || '-'}</td>
                  <td className="p-2">{Number(r.totals?.grandTotal || r.total || 0).toLocaleString('ar-SA')}</td>
                  <td className="p-2">{Number(paid || r.paid || 0).toLocaleString('ar-SA')}</td>
                  <td className="p-2">{Number(r.totals?.balance || r.balance || 0).toLocaleString('ar-SA')}</td>
                  <td className="p-2" dir="ltr">{new Date(r.dueAt).toLocaleDateString('ar-SA')}</td>
                  <td className="p-2">{statusLabel(r.status)}</td>
                  <td className="p-2 text-left">
                    <div className="flex gap-2 justify-end">
                      <button className="px-2 py-1 rounded border">تسجيل دفعة</button>
                      <button className="px-2 py-1 rounded border">إرسال تذكير</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function statusLabel(s: string) {
  if (s === 'active') return 'نشط';
  if (s === 'overdue') return 'متأخر';
  if (s === 'completed') return 'مكتمل';
  if (s === 'canceled') return 'ملغى';
  if (s === 'forfeited') return 'مصادَر';
  return s;
}

