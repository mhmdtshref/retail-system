"use client";
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

type Shipment = {
  _id: string;
  saleId: string;
  provider: string;
  externalId: string;
  labelUrl?: string;
  policyUrl?: string;
  status: 'created'|'in_transit'|'out_for_delivery'|'delivered'|'failed'|'returned';
  moneyStatus: 'pending'|'with_delivery_company'|'remitted_to_shop';
  createdAt: number;
};

export default function DeliveryBoard() {
  const t = useTranslations();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'created'|'in_transit'|'out_for_delivery'|'delivered'|'failed_returned'>('created');

  async function fetchShipments() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tab === 'failed_returned') {
        params.append('status', 'failed');
        params.append('status', 'returned');
      } else {
        params.append('status', tab);
      }
      if (q) params.set('q', q);
      const res = await fetch(`/api/delivery/shipments?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setShipments(data.shipments || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchShipments(); }, [tab]);

  const grouped = useMemo(() => shipments, [shipments]);

  return (
    <main className="p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">{t('delivery.title')}</h2>
        <div className="ms-auto flex gap-2">
          <input className="border rounded px-2 py-1 text-sm" placeholder={t('delivery.searchPlaceholder') as string} value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="px-3 py-1 border rounded text-sm" onClick={() => fetchShipments()}>{t('delivery.refresh')}</button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        <button className={`px-3 py-1 rounded border ${tab==='created'?'bg-neutral-200 dark:bg-neutral-800':''}`} onClick={() => setTab('created')}>{t('delivery.new')}</button>
        <button className={`px-3 py-1 rounded border ${tab==='in_transit'?'bg-neutral-200 dark:bg-neutral-800':''}`} onClick={() => setTab('in_transit')}>{t('delivery.inTransit')}</button>
        <button className={`px-3 py-1 rounded border ${tab==='out_for_delivery'?'bg-neutral-200 dark:bg-neutral-800':''}`} onClick={() => setTab('out_for_delivery')}>{t('delivery.outForDelivery')}</button>
        <button className={`px-3 py-1 rounded border ${tab==='delivered'?'bg-neutral-200 dark:bg-neutral-800':''}`} onClick={() => setTab('delivered')}>{t('delivery.delivered')}</button>
        <button className={`px-3 py-1 rounded border ${tab==='failed_returned'?'bg-neutral-200 dark:bg-neutral-800':''}`} onClick={() => setTab('failed_returned')}>{t('delivery.failed')}/{t('delivery.returned')}</button>
      </div>

      <div className="overflow-auto">
        <table className="w-full text-sm border">
          <thead>
            <tr className="bg-neutral-50 dark:bg-neutral-900">
              <th className="p-2 text-start">#</th>
              <th className="p-2 text-start">{t('delivery.status')}</th>
              <th className="p-2 text-start">{t('delivery.moneyStatus')}</th>
              <th className="p-2 text-start">{t('delivery.createdAt')}</th>
              <th className="p-2 text-start">{t('delivery.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map((s) => (
              <tr key={s._id} className="border-t">
                <td className="p-2">{s.externalId}</td>
                <td className="p-2">{s.status}</td>
                <td className="p-2">{s.moneyStatus}</td>
                <td className="p-2">{new Date(s.createdAt).toLocaleString()}</td>
                <td className="p-2 flex gap-2">
                  {s.labelUrl && <a className="px-2 py-1 border rounded" href={s.labelUrl} target="_blank" rel="noreferrer">{t('delivery.label')}</a>}
                  <button className="px-2 py-1 border rounded" onClick={async () => {
                    await fetch('/api/delivery/shipments/refresh', { method: 'POST' });
                    fetchShipments();
                  }}>{t('delivery.refresh')}</button>
                  {s.status === 'delivered' && s.moneyStatus !== 'remitted_to_shop' && (
                    <button className="px-2 py-1 border rounded bg-emerald-600 text-white" onClick={async () => {
                      await fetch(`/api/delivery/shipments/${s._id}/mark-remitted`, { method: 'POST', headers: { 'Idempotency-Key': `${s._id}:remit:${Date.now()}` } });
                      fetchShipments();
                    }}>{t('delivery.markRemitted')}</button>
                  )}
                </td>
              </tr>
            ))}
            {grouped.length === 0 && (
              <tr><td className="p-3 text-center text-muted-foreground" colSpan={5}>{loading ? '...' : '—'}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}



