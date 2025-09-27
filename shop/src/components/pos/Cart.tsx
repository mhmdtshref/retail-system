"use client";
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { usePosStore } from '@/lib/store/posStore';

export function Cart() {
  const t = useTranslations();
  const lines = usePosStore((s: any) => s.lines);
  const updateQty = usePosStore((s: any) => s.updateQty);
  const removeLine = usePosStore((s: any) => s.removeLine);
  const total = useMemo(() => lines.reduce((sum, l) => sum + l.qty * l.price, 0), [lines]);

  return (
    <div className="rounded border divide-y">
      {lines.map((l) => (
        <div key={l.sku} className="p-2 flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <div className="truncate font-medium">{l.name}{(l.size || l.color) ? ` (${[l.size, l.color].filter(Boolean).join(', ')})` : ''}</div>
            <div className="text-xs text-gray-500">{l.sku}</div>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-2 rounded border" onClick={() => updateQty(l.sku, Math.max(1, l.qty - 1))}>−</button>
            <div className="w-8 text-center">{l.qty}</div>
            <button className="px-2 rounded border" onClick={() => updateQty(l.sku, l.qty + 1)}>+</button>
          </div>
          <div className="w-20 text-end">{(l.qty * l.price).toFixed(2)}</div>
          <button aria-label={t('common.remove') || 'حذف'} className="ms-2 text-red-600" onClick={() => removeLine(l.sku)}>×</button>
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

