"use client";
import { useEffect, useState } from 'react';

export default function LayawayDetail({ params }: { params: { id: string } }) {
  const [d, setD] = useState<any | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/layaway/${params.id}`);
        if (res.ok) setD(await res.json());
      } catch {}
    })();
  }, [params.id]);
  const layaway = d?.layaway;
  return (
    <main className="p-4" dir="rtl">
      <h1 className="text-xl font-semibold mb-3">تفاصيل الحجز</h1>
      {!layaway && <div>...</div>}
      {layaway && (
        <div className="grid gap-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="rounded border p-2"><div className="text-xs text-neutral-500">المبلغ الإجمالي</div><div className="font-semibold">{Number(layaway.totals?.grandTotal||0).toLocaleString('ar-SA')}</div></div>
            <div className="rounded border p-2"><div className="text-xs text-neutral-500">المدفوع</div><div className="font-semibold">{(Number(layaway.totals?.upfrontPaid||0) + (layaway.payments||[]).reduce((s: number,p: any)=> s+(p.amount||0),0)).toLocaleString('ar-SA')}</div></div>
            <div className="rounded border p-2"><div className="text-xs text-neutral-500">المتبقي</div><div className="font-semibold">{Number(layaway.totals?.balance||0).toLocaleString('ar-SA')}</div></div>
            <div className="rounded border p-2"><div className="text-xs text-neutral-500">تاريخ الاستحقاق</div><div className="font-semibold" dir="ltr">{new Date(layaway.dueAt).toLocaleDateString('ar-SA')}</div></div>
          </div>
          <div className="rounded border p-2">
            <div className="font-medium mb-1">المدفوعات</div>
            <div className="space-y-1 text-sm">
              {layaway.payments?.map((p: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between">
                  <div>{p.method}</div>
                  <div>{Number(p.amount||0).toLocaleString('ar-SA')}</div>
                  <div dir="ltr">{new Date(p.at).toLocaleString('ar-SA')}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

