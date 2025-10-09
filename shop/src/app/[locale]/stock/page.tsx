"use client";
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { LocationSwitcher } from '@/components/pos/LocationSwitcher';
import { VirtualTable } from '@/components/virtualized/VirtualTable';

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

  const columns = useMemo(() => ([
    { key: 'sku', header: 'SKU', width: 200 },
    { key: 'available', header: 'المتاح', width: 140 },
    { key: 'reserved', header: 'المحجوز', width: 140 },
    { key: 'onHand', header: 'المخزون', width: 140 },
  ]), []);

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
      <VirtualTable rows={rows} columns={columns as any} rowKey={(r:any)=> r.sku} />
    </main>
  );
}
