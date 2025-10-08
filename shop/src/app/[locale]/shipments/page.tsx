"use client";
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

type Shipment = {
  _id: string;
  orderId: string;
  carrier: string;
  trackingNumber?: string;
  status: 'created'|'label_generated'|'handover'|'in_transit'|'out_for_delivery'|'delivered'|'failed'|'returned'|'cancelled';
  to: { name: string; city: string; country: string };
  cod?: { enabled?: boolean };
  labelUrl?: string;
  updatedAt: string;
  createdAt: string;
};

export default function ShipmentsPage() {
  const t = useTranslations();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [filters, setFilters] = useState<{ carrier?: string; status?: string; city?: string; cod?: string; from?: string; to?: string }>({});
  const [loading, setLoading] = useState(false);

  async function fetchShipments() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.carrier) params.append('carrier', filters.carrier);
      if (filters.status) params.append('status', filters.status);
      if (filters.city) params.append('city', filters.city);
      if (filters.cod) params.append('cod', filters.cod);
      if (filters.from) params.append('dateFrom', String(new Date(filters.from).getTime()));
      if (filters.to) params.append('dateTo', String(new Date(filters.to).getTime()));
      const res = await fetch(`/api/shipments?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setShipments(data.shipments || []);
      }
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchShipments(); }, []);

  const list = useMemo(() => shipments, [shipments]);

  return (
    <main className="p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">{t('delivery.title')}</h2>
        <div className="ms-auto flex gap-2">
          <select className="border rounded px-2 py-1 text-sm" value={filters.status || ''} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || undefined }))}>
            <option value="">— {t('delivery.status')}</option>
            <option value="created">جديدة</option>
            <option value="in_transit">جاري الشحن</option>
            <option value="out_for_delivery">خارج للتسليم</option>
            <option value="delivered">تم التسليم</option>
            <option value="failed">فشل التسليم</option>
            <option value="returned">مرتجع</option>
            <option value="cancelled">ملغاة</option>
          </select>
          <input className="border rounded px-2 py-1 text-sm" placeholder={t('delivery.city') as string} value={filters.city || ''} onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value || undefined }))} />
          <select className="border rounded px-2 py-1 text-sm" value={filters.cod || ''} onChange={(e) => setFilters((f) => ({ ...f, cod: e.target.value || undefined }))}>
            <option value="">COD</option>
            <option value="true">نعم</option>
            <option value="false">لا</option>
          </select>
          <button className="px-3 py-1 border rounded text-sm" onClick={() => fetchShipments()}>{t('delivery.refresh')}</button>
        </div>
      </div>

      <div className="overflow-auto">
        <table className="w-full text-sm border">
          <thead>
            <tr className="bg-neutral-50 dark:bg-neutral-900">
              <th className="p-2 text-start">{t('delivery.customer')}</th>
              <th className="p-2 text-start">شركة الشحن</th>
              <th className="p-2 text-start">رقم التتبع</th>
              <th className="p-2 text-start">{t('delivery.status')}</th>
              <th className="p-2 text-start">{t('delivery.city')}</th>
              <th className="p-2 text-start">{t('delivery.createdAt')}</th>
              <th className="p-2 text-start">{t('delivery.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr key={s._id} className="border-t">
                <td className="p-2">{s.to?.name}</td>
                <td className="p-2">{s.carrier}</td>
                <td className="p-2">{s.trackingNumber || '—'}</td>
                <td className="p-2">{s.status}</td>
                <td className="p-2">{s.to?.city}</td>
                <td className="p-2">{new Date(s.createdAt).toLocaleString()}</td>
                <td className="p-2 flex gap-2">
                  {s.labelUrl && <a className="px-2 py-1 border rounded" href={s.labelUrl} target="_blank" rel="noreferrer">{t('delivery.label')}</a>}
                  <a className="px-2 py-1 border rounded" href={`/api/shipments?id=${s._id}`} target="_blank" rel="noreferrer">تفاصيل</a>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td className="p-3 text-center text-muted-foreground" colSpan={7}>{loading ? '...' : '—'}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

