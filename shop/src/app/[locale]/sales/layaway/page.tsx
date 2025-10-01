"use client";
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

type Row = { id: string; customerId?: string; createdAt: number; remaining: number; nextDueDate?: string; overdueDays: number; status: string };

export default function LayawayPage() {
  const t = useTranslations();
  const [rows, setRows] = useState<Row[]>([]);
  const [rollup, setRollup] = useState<{ ['0-7']: number; ['8-14']: number; ['15-30']: number; ['>30']: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/sales/layaway');
        if (!res.ok) throw new Error('failed');
        const data = await res.json();
        if (!cancelled) {
          setRows(data.rows);
          setRollup(data.rollup);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <main className="p-4" dir="rtl">
      <h1 className="text-xl font-semibold mb-3">{t('layaway.title') || 'تقسيط/الحجوزات'}</h1>
      {rollup && (
        <div className="grid grid-cols-4 gap-2 mb-4 text-center">
          <div className="rounded border p-2">
            <div className="text-xs text-neutral-500">0–7</div>
            <div className="font-semibold">{rollup['0-7'].toFixed(2)}</div>
          </div>
          <div className="rounded border p-2">
            <div className="text-xs text-neutral-500">8–14</div>
            <div className="font-semibold">{rollup['8-14'].toFixed(2)}</div>
          </div>
          <div className="rounded border p-2">
            <div className="text-xs text-neutral-500">15–30</div>
            <div className="font-semibold">{rollup['15-30'].toFixed(2)}</div>
          </div>
          <div className="rounded border p-2">
            <div className="text-xs text-neutral-500">{t('layaway.over30') || 'أكثر من 30'}</div>
            <div className="font-semibold">{rollup['>30'].toFixed(2)}</div>
          </div>
        </div>
      )}

      <div className="rounded border overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="p-2 text-right">{t('layaway.customer') || 'العميل'}</th>
              <th className="p-2">{t('layaway.remaining') || 'المتبقي'}</th>
              <th className="p-2">{t('layaway.nextDue') || 'الاستحقاق التالي'}</th>
              <th className="p-2">{t('layaway.overdueDays') || 'العمر'}</th>
              <th className="p-2">{t('layaway.status') || 'الحالة'}</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.customerId || '-'}</td>
                <td className="p-2">{r.remaining.toFixed(2)}</td>
                <td className="p-2" dir="ltr">{r.nextDueDate ? new Date(r.nextDueDate).toLocaleDateString() : '-'}</td>
                <td className="p-2">{r.overdueDays || 0}</td>
                <td className="p-2">{r.status}</td>
                <td className="p-2 text-left">
                  <div className="flex gap-2 justify-end">
                    <button className="px-2 py-1 rounded border">{t('layaway.collect') || 'تحصيل دفعة'}</button>
                    <button className="px-2 py-1 rounded border">{t('layaway.cancel') || 'إلغاء الحجز'}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

