"use client";
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { usePosStore } from '@/lib/store/posStore';
import { posDb } from '@/lib/db/posDexie';
import { Search } from '@/components/pos/Search';
import { Cart } from '@/components/pos/Cart';
import { PayModal } from '@/components/pos/PayModal';
import { Receipt } from '@/components/pos/Receipt';
import { Totals } from '@/components/pos/Totals';

export default function POSPage() {
  const t = useTranslations();
  const lines = usePosStore((s: any) => s.lines);
  const addLineStore = usePosStore((s: any) => s.addLine);
  const startSale = usePosStore((s: any) => s.startSale);
  const startPartialSale = usePosStore((s: any) => s.startPartialSale);
  const addPayment = usePosStore((s: any) => s.addPayment);
  const lastReceipt = usePosStore((s: any) => s.lastReceipt);
  const [offline, setOffline] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [showPay, setShowPay] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const count = await posDb.products.count();
      if (count === 0) {
        try {
          const res = await fetch('/api/pos/bootstrap');
          if (res.ok) {
            const data = await res.json();
            await posDb.products.bulkPut(data.products);
            await posDb.availabilitySnapshot.bulkPut(data.availability);
          }
        } catch {}
      }
      if (!cancelled) setBootstrapped(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const subtotal = useMemo(
    () => (lines as any[]).reduce((sum: number, l: any) => sum + l.qty * l.price, 0),
    [lines]
  );
  const discount = usePosStore((s: any) => s.discount);
  const { discountValue, grand } = useMemo(() => {
    const val = discount
      ? (discount.type === 'percent' ? (subtotal * Math.min(100, Math.max(0, discount.value))) / 100 : Math.min(Math.max(0, discount.value), subtotal))
      : 0;
    return { discountValue: val, grand: Math.max(0, subtotal - val) };
  }, [discount, subtotal]);

  return (
    <main className="p-4 flex flex-col gap-3">
      {offline && (
        <div className="rounded bg-yellow-100 text-yellow-900 p-2 text-sm">
          {t('pos.offline')}
        </div>
      )}
      <div className="flex items-center gap-2">
        <span className="font-medium">{t('pos.cart')}</span>
      </div>

      <div className="sticky top-0 z-10 bg-white/80 dark:bg-neutral-900/80 backdrop-blur p-1 rounded">
        <Search onAdd={(line) => addLineStore(line)} />
      </div>

      <Cart />

      <Totals subtotal={subtotal} />

      <div className="sticky bottom-2 mt-2 bg-white dark:bg-black border rounded p-3 flex items-center justify-between">
        <div className="text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{t('pos.preDiscountTotal') || 'الإجمالي قبل الخصم'}:</span>
            <span>{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{t('pos.discountValue') || 'قيمة الخصم'}:</span>
            <span className="text-rose-600">-{discountValue.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2 font-semibold">
            <span>{t('pos.grandTotal') || 'الإجمالي النهائي'}:</span>
            <span>{grand.toFixed(2)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded bg-emerald-600 text-white disabled:opacity-50" disabled={lines.length===0} onClick={() => setShowPay(true)}>{t('pos.pay')}</button>
          <button className="px-3 py-2 rounded border disabled:opacity-50" disabled={!lastReceipt} onClick={() => {
            if (!lastReceipt) return;
            const popup = window.open('', '_blank');
            if (!popup) return;
            popup.document.write(`<link rel=\"stylesheet\" href=\"/styles/receipt.css\" />`);
            popup.document.write(document.querySelector('#__receipt_print')?.innerHTML || '');
            popup.document.close();
            popup.focus();
            popup.print();
          }}>{t('pos.receipt')}</button>
        </div>
      </div>

      {showPay && (
        <PayModal
          total={grand}
          onClose={() => setShowPay(false)}
          onConfirmCash={async (amount, meta) => { await startSale(); await addPayment('cash', amount, meta); setShowPay(false); }}
          onConfirmCard={async (amount) => { await startSale(); await addPayment('card', amount, {} as any); setShowPay(false); }}
          onConfirmPartial={async (amount, meta) => { await startPartialSale(amount, { schedule: meta.plan?.schedule, minDownPercent: 10, note: meta.reservationNote }); setShowPay(false); }}
        />
      )}

      <div id="__receipt_print" className="hidden print:block">
        {lastReceipt && <Receipt data={lastReceipt} />}
      </div>
    </main>
  );
}

