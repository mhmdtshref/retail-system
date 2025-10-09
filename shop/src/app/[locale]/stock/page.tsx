"use client";
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { LocationSwitcher } from '@/components/pos/LocationSwitcher';

export default function StockPage() {
  const t = useTranslations();
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [locationId, setLocationId] = useState<string>('');
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);

  useEffect(() => {
    if (!locationId) return;
    (async () => {
      const params = new URLSearchParams();
      params.set('locationId', locationId);
      if (q) params.set('q', q);
      const res = await fetch('/api/stock?' + params.toString());
      if (res.ok) {
        const data = await res.json();
        const list = (data.availability || []).map((a: any) => ({ sku: a.sku, onHand: a.onHand, reserved: a.reserved, available: a.available }));
        setRows(list);
      }
    })();
  }, [locationId, q]);

  const csv = useMemo(() => {
    const header = ['SKU','المتاح','المحجوز','المخزون'];
    const lines = rows.map((r) => [r.sku, r.available, r.reserved, r.onHand].join(','));
    return [header.join(','), ...lines].join('\n');
  }, [rows]);

  return (
    <main className="p-4 space-y-3">
      {offline && (
        <div className="rounded bg-yellow-100 text-yellow-900 p-2 text-sm">{t('reports.offlineBanner') || 'عرض بيانات مخزنة مؤقتًا'}</div>
      )}
      <div className="flex items-center gap-2">
        <LocationSwitcher />
        <input className="border rounded px-2 py-1" placeholder={t('products.searchPlaceholder') || 'بحث'} value={q} onChange={(e)=> setQ(e.target.value)} />
        <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`} download={`stock-${locationId}.csv`} className="px-2 py-1 rounded border">CSV</a>
      </div>
      <div className="rounded border divide-y">
        <div className="grid grid-cols-4 gap-2 p-2 text-xs text-muted-foreground">
          <div>SKU</div>
          <div>المتاح</div>
          <div>المحجوز</div>
          <div>المخزون</div>
        </div>
        {rows.map((r) => (
          <div key={r.sku} className="grid grid-cols-4 gap-2 p-2 text-sm">
            <div className="font-mono">{r.sku}</div>
            <div>{r.available}</div>
            <div>{r.reserved}</div>
            <div>{r.onHand}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
