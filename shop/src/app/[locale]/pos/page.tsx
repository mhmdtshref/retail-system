"use client";
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { usePosStore } from '@/lib/store/posStore';

type CartLine = { sku: string; name: string; qty: number; price: number };

export default function POSPage() {
  const t = useTranslations();
  const lines = usePosStore((s) => s.lines);
  const addLineStore = usePosStore((s) => s.addLine);
  const startSale = usePosStore((s) => s.startSale);
  const addPayment = usePosStore((s) => s.addPayment);
  const [offline, setOffline] = useState(false);

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

  const total = useMemo(
    () => lines.reduce((sum, l) => sum + l.qty * l.price, 0),
    [lines]
  );

  function addDemo() {
    addLineStore({ sku: 'SKU-001', name: 'تيشيرت', price: 50 });
  }

  return (
    <main className="p-4 flex flex-col gap-3">
      {offline && (
        <div className="rounded bg-yellow-100 text-yellow-900 p-2 text-sm">
          {t('pos.offline')}
        </div>
      )}
      <div className="flex items-center gap-2">
        <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={addDemo}>
          +
        </button>
        <span className="font-medium">{t('pos.cart')}</span>
      </div>

      <ul className="divide-y rounded border">
        {lines.map((l, i) => (
          <li key={i} className="flex justify-between p-2">
            <span className="truncate max-w-[60%]">{l.name}</span>
            <span>{l.qty} × {l.price.toFixed(2)}</span>
          </li>
        ))}
        {lines.length === 0 && (
          <li className="p-2 text-muted-foreground">—</li>
        )}
      </ul>

      <div className="sticky bottom-2 mt-2 bg-white dark:bg-black border rounded p-3 flex items-center justify-between">
        <span className="font-semibold">{t('pos.total')}: {total.toFixed(2)}</span>
        <button className="px-4 py-2 rounded bg-emerald-600 text-white" onClick={async () => {
          await startSale();
          await addPayment('cash', total);
        }}>{t('pos.pay')}</button>
      </div>
    </main>
  );
}

