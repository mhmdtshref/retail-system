"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { saveTrackSnapshot, loadTrackSnapshot } from '@/lib/offline/track-cache';

type TrackData = {
  header: { orderId: string; code: string; status: string; progressPct: number };
  shipments: any[];
  items?: any[];
  payments?: any;
  shippingTo?: any;
};

export default function TrackOrderPage({ params }: { params: { id: string } }) {
  const search = useSearchParams();
  const t = search.get('t') || '';
  const id = params.id;
  const [intervalMs, setIntervalMs] = useState(15000);
  const [data, setData] = useState<TrackData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let mounted = true;
    let timer: any;
    async function loadOnce() {
      if (!t) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/public/orders/${id}?t=${encodeURIComponent(t)}`);
        const json = await res.json();
        if (!mounted) return;
        if (!res.ok) { setError(json?.error || 'error'); setLoading(false); return; }
        setData(json);
        setError(null);
      } catch (e: any) {
        if (mounted) setError('network');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    async function tick() {
      try {
        await fetch('/api/public/track/refresh', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderId: id, t }) });
        await loadOnce();
        setIntervalMs((cur: number) => Math.min(cur * 2, 60000));
      } catch {}
      timer = setTimeout(tick, intervalMs);
    }
    loadOnce();
    timer = setTimeout(tick, intervalMs);
    return () => { mounted = false; clearTimeout(timer); };
  }, [id, t, intervalMs]);

  // Save snapshot when online; attempt load when offline
  useEffect(() => {
    if (data?.header?.orderId && data?.header?.code) {
      saveTrackSnapshot({ orderId: data.header.orderId, code: data.header.code, snapshotJson: data });
      setOffline(false);
    }
  }, [data]);
  useEffect(() => {
    async function maybeLoad() {
      if (!navigator.onLine && t) {
        const snap = await loadTrackSnapshot(id);
        if (snap) {
          setOffline(true);
        }
      }
    }
    maybeLoad();
    function onOnline() { setOffline(false); mutate(); }
    function onOffline() { setOffline(true); }
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [id, t, mutate]);

  const shipments = useMemo(() => data?.shipments || [], [data]);
  const header = data?.header;
  const items = data?.items || [];
  const payments = data?.payments || {};
  const shippingTo = data?.shippingTo;
  const cod = shipments.some((s: any) => s?.cod?.enabled);

  return (
    <div className="max-w-3xl mx-auto p-4" dir="rtl">
      <h1 className="text-xl font-semibold mb-2">تتبع الطلب <bdi dir="ltr">{header?.code}</bdi></h1>
      {header?.status === 'delivered' && (
        <div role="status" aria-live="polite" className="mb-3 rounded bg-green-50 text-green-800 px-3 py-2 text-sm">تم التسليم</div>
      )}
      {cod && header?.status !== 'delivered' && (
        <div role="status" aria-live="polite" className="mb-3 rounded bg-yellow-50 text-yellow-800 px-3 py-2 text-sm">المبلغ سيتم تحصيله عند التسليم</div>
      )}
      {offline && (
        <div role="status" aria-live="polite" className="mb-3 rounded bg-blue-50 text-blue-800 px-3 py-2 text-sm">تم عرض آخر حالة معروفة. سيتم التحديث عند الاتصال.</div>
      )}
      {error && <div className="text-red-600 text-sm">حدث خطأ في التحميل</div>}
      {loading && <div className="text-sm text-gray-500">جاري التحميل…</div>}
      {header && (
        <div className="sticky top-0 bg-white/80 backdrop-blur border rounded p-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="text-sm">الحالة: <span className="font-semibold">{translateStatus(header.status)}</span></div>
            <div className="text-sm">التقدم: {header.progressPct}%</div>
          </div>
        </div>
      )}
      <div className="space-y-4">
        {/* Address */}
        {shippingTo && (
          <div className="border rounded p-3 text-sm">
            <div className="font-medium mb-1">العنوان</div>
            <div>{shippingTo.name}</div>
            <div>{shippingTo.address1}</div>
            <div>{shippingTo.city}، {shippingTo.country}</div>
          </div>
        )}
        {/* Items */}
        {items.length > 0 && (
          <div className="border rounded">
            <table className="w-full text-sm">
              <thead><tr className="bg-neutral-50"><th className="p-2 text-start">العنصر</th><th className="p-2 text-start">الخيارات</th><th className="p-2 text-start">الكمية</th><th className="p-2 text-start">السعر</th></tr></thead>
              <tbody>
                {items.map((it: any, idx: number) => (
                  <tr key={idx} className="border-t">
                    <td className="p-2">{it.name}</td>
                    <td className="p-2">{[it.size, it.color].filter(Boolean).join(' / ')}</td>
                    <td className="p-2">{it.qty}</td>
                    <td className="p-2"><bdi dir="ltr">{Number(it.price).toFixed(2)}</bdi></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Payments */}
        {payments && (
          <div className="border rounded p-3 text-sm">
            <div className="font-medium mb-2">ملخص الدفع</div>
            <div className="flex justify-between"><span>الإجمالي الفرعي</span><bdi dir="ltr">{Number(payments.subtotal || 0).toFixed(2)}</bdi></div>
            <div className="flex justify-between"><span>الإجمالي</span><bdi dir="ltr">{Number(payments.grand || 0).toFixed(2)}</bdi></div>
            <div className="flex justify-between"><span>المدفوع</span><bdi dir="ltr">{Number(payments.paid || 0).toFixed(2)}</bdi></div>
            <div className="flex justify-between"><span>المتبقي</span><bdi dir="ltr">{Number(payments.balance || 0).toFixed(2)}</bdi></div>
          </div>
        )}
        {shipments.map((s: any) => (
          <div key={s.id} className="border rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm">شركة الشحن: <span className="font-medium">{s.carrier?.toUpperCase()}</span></div>
              <div className="text-sm">رقم التتبع: <bdi dir="ltr">{s.trackingNumber || '-'}</bdi></div>
            </div>
            <div className="text-xs text-gray-600 mb-2">الحالة: {translateStatus(s.status)}</div>
            <ol className="text-sm space-y-1">
              {(s.events || []).slice().reverse().map((e: any, idx: number) => (
                <li key={idx} aria-label={`الحدث ${translateStatus(e.status)} عند ${new Date(e.at).toLocaleString('ar-SA')}`}>• {translateStatus(e.status)} — <bdi dir="ltr">{new Date(e.at).toLocaleString('ar-SA')}</bdi></li>
              ))}
            </ol>
          </div>
        ))}
        {!shipments.length && !isLoading && (
          <div className="text-sm text-gray-500">لا توجد شحنات بعد.</div>
        )}
      </div>
    </div>
  );
}

function translateStatus(s?: string) {
  switch (s) {
    case 'created': return 'تم الإنشاء';
    case 'label_generated': return 'تم إصدار الملصق';
    case 'handover': return 'تم التسليم لشركة الشحن';
    case 'in_transit': return 'قيد الشحن';
    case 'out_for_delivery': return 'خارج للتسليم';
    case 'delivered': return 'تم التسليم';
    case 'failed': return 'تعذّر التسليم';
    case 'returned': return 'مرتجع';
    case 'cancelled': return 'ملغاة';
    default: return s || '';
  }
}

