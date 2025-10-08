"use client";
import { useEffect, useState } from 'react';

type Props = { customerId: string | null; onClose: () => void };

export function MiniProfileDrawer({ customerId, onClose }: Props) {
  const [data, setData] = useState<any | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!customerId) { setData(null); return; }
      try {
        const res = await fetch(`/api/customers/${customerId}`);
        if (res.ok) {
          const d = await res.json();
          if (!cancelled) setData(d.customer);
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [customerId]);

  if (!customerId) return null;
  return (
    <div className="fixed inset-y-0 left-0 w-80 bg-white dark:bg-neutral-900 border-r shadow-lg z-40">
      <div className="p-3 flex items-center justify-between border-b">
        <div className="font-medium">العميل</div>
        <button onClick={onClose}>✕</button>
      </div>
      <div className="p-3 space-y-2">
        {data ? (
          <>
            <div className="text-lg font-semibold">{data.fullName_ar || data.fullName_en}</div>
            <div className="text-sm text-muted-foreground">{(data.phones || []).map((p: any) => p.e164).join(' • ')}</div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded border p-2">
                <div className="text-muted-foreground">إجمالي المشتريات</div>
                <div className="font-medium">{(data.stats?.lifetimeSpend || 0).toFixed(2)}</div>
              </div>
              <div className="rounded border p-2">
                <div className="text-muted-foreground">عدد الطلبات</div>
                <div className="font-medium">{data.stats?.ordersCount || 0}</div>
              </div>
              <div className="rounded border p-2">
                <div className="text-muted-foreground">آخر طلب</div>
                <div className="font-medium">{data.stats?.lastOrderAt ? new Date(data.stats.lastOrderAt).toLocaleDateString() : '—'}</div>
              </div>
              <div className="rounded border p-2">
                <div className="text-muted-foreground">رصيد المتجر</div>
                <div className="font-medium">{(data.stats?.storeCredit || 0).toFixed(2)}</div>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <a className="px-3 py-1 rounded border" href={`/customers/${data._id}`} target="_blank">الملف الكامل</a>
            </div>
          </>
        ) : (
          <div className="text-sm text-muted-foreground">...تحميل</div>
        )}
      </div>
    </div>
  );
}

