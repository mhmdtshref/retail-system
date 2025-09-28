"use client";
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { usePosStore } from '@/lib/store/posStore';
import type { PosCartLine } from '@/lib/pos/types';

export function Cart() {
  const t = useTranslations();
  const lines = usePosStore((s: any) => s.lines);
  const updateQty = usePosStore((s: any) => s.updateQty);
  const removeLine = usePosStore((s: any) => s.removeLine);
  const total = useMemo(() => (lines as PosCartLine[]).reduce((sum: number, l: PosCartLine) => sum + l.qty * l.price, 0), [lines]);

  return (
    <div className="space-y-2">
      {(lines as PosCartLine[]).map((l: PosCartLine) => (
        <div key={l.sku} className="border rounded p-3 shadow-sm bg-white dark:bg-neutral-900">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="truncate font-medium">{l.name}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {l.size && <span className="inline-flex items-center rounded-full border px-2 py-0.5">{t('pos.size') || 'المقاس'}: {l.size}</span>}
                {l.color && <span className="inline-flex items-center rounded-full border px-2 py-0.5">{t('pos.color') || 'اللون'}: {l.color}</span>}
                <span className="text-gray-500">{l.sku}</span>
              </div>
            </div>
            <div className="text-end w-24 font-semibold">{(l.qty * l.price).toFixed(2)}</div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button className="h-8 w-8 grid place-items-center rounded-full border" onClick={() => updateQty(l.sku, Math.max(1, l.qty - 1))} aria-label="decrement">−</button>
              <div className="w-8 text-center" aria-live="polite">{l.qty}</div>
              <button className="h-8 w-8 grid place-items-center rounded-full border" onClick={() => updateQty(l.sku, l.qty + 1)} aria-label="increment">+</button>
            </div>
            <button aria-label={t('common.remove') || 'حذف'} className="text-red-600 hover:text-red-700" onClick={() => {
              if (confirm(t('common.remove') || 'حذف')) removeLine(l.sku);
            }}>🗑️</button>
          </div>
        </div>
      ))}
      {lines.length === 0 && <div className="p-2 text-muted-foreground">—</div>}
      <div className="p-2 flex items-center justify-between">
        <div className="font-semibold">{t('pos.subtotal') || 'الإجمالي الفرعي'}</div>
        <div className="font-semibold">{total.toFixed(2)}</div>
      </div>
    </div>
  );
}

