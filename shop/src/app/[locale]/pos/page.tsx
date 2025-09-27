"use client";
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { usePosStore } from '@/lib/store/posStore';
import { posDb } from '@/lib/db/posDexie';
import { Search } from '@/components/pos/Search';
import { Cart } from '@/components/pos/Cart';
import { PayModal } from '@/components/pos/PayModal';
import { Receipt } from '@/components/pos/Receipt';

export default function POSPage() {
  const t = useTranslations();
  const lines = usePosStore((s: any) => s.lines);
  const addLineStore = usePosStore((s: any) => s.addLine);
  const startSale = usePosStore((s: any) => s.startSale);
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

  const total = useMemo(
    () => (lines as any[]).reduce((sum: number, l: any) => sum + l.qty * l.price, 0),
    [lines]
  );

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

      <Search onAdd={(line) => addLineStore(line)} />

      <Cart />

      <div className="sticky bottom-2 mt-2 bg-white dark:bg-black border rounded p-3 flex items-center justify-between">
        <span className="font-semibold">{t('pos.total')}: {total.toFixed(2)}</span>
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
          total={total}
          onClose={() => setShowPay(false)}
          onConfirmCash={async (amount, meta) => { await startSale(); await addPayment('cash', amount, meta); setShowPay(false); }}
          onConfirmCard={async (amount, meta) => { await startSale(); await addPayment('card', amount, meta); setShowPay(false); }}
          onConfirmPartial={async (amount, meta) => { await startSale(); await addPayment('partial', amount, meta); setShowPay(false); }}
        />
      )}

      <div id="__receipt_print" className="hidden print:block">
        {lastReceipt && <Receipt data={lastReceipt} />}
      </div>
    </main>
  );
}

