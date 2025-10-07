"use client";
import { useMemo, useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { usePosStore } from '@/lib/store/posStore';
import type { Discount } from '@/lib/pos/types';
import { MANUAL_DISCOUNT_LIMIT } from '@/lib/policy/policies';
import { getCachedSettings } from '@/lib/offline/settings-cache';

type Props = {
  subtotal: number;
};

export function Totals({ subtotal }: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const discount = usePosStore((s: any) => s.discount) as Discount | null;
  const setDiscount = usePosStore((s: any) => s.setDiscount) as (d: Discount | null) => void;
  const nf = useMemo(() => new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), [locale]);

  const [type, setType] = useState<Discount['type']>(discount?.type || 'percent');
  const [valueInput, setValueInput] = useState<string>(discount ? String(discount.value) : '0');
  const [limitPct, setLimitPct] = useState<number>(MANUAL_DISCOUNT_LIMIT * 100);

  useEffect(() => {
    // Sync when external discount changes
    if (discount) {
      setType(discount.type);
      setValueInput(String(discount.value));
    } else {
      setValueInput('0');
    }
  }, [discount]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const s = await res.json();
          const lim = Number(s?.payments?.cashierManualDiscountLimitPct ?? MANUAL_DISCOUNT_LIMIT * 100);
          setLimitPct(isNaN(lim) ? MANUAL_DISCOUNT_LIMIT * 100 : lim);
          return;
        }
      } catch {}
      const cached = await getCachedSettings();
      if (cached?.payments?.cashierManualDiscountLimitPct != null) setLimitPct(Number(cached.payments.cashierManualDiscountLimitPct));
    })();
  }, []);

  const valueNum = Number(valueInput) || 0;
  const percentValid = type === 'percent' ? valueNum >= 0 && valueNum <= 100 : true;
  const fixedValid = type === 'fixed' ? valueNum >= 0 && valueNum <= subtotal : true;
  const isValid = percentValid && fixedValid;

  const discountValue = useMemo(() => {
    if (!isValid) return 0;
    if (type === 'percent') return (subtotal * valueNum) / 100;
    return Math.min(valueNum, subtotal);
  }, [isValid, subtotal, type, valueNum]);

  const grand = Math.max(0, subtotal - discountValue);

  useEffect(() => {
    if (!isValid) return;
    let capped = valueNum;
    if (type === 'percent' && valueNum > limitPct) {
      capped = limitPct;
    }
    const d: Discount = { type, value: capped };
    // Persist to store
    setDiscount((capped === 0) ? null : d);
  }, [type, valueNum, isValid, setDiscount]);

  return (
    <div className="rounded border p-3 space-y-3">
      <div className="flex items-center gap-2">
        <div className="font-medium">{t('pos.discount') || 'الخصم'}</div>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as Discount['type'])}
          className="border rounded px-2 py-1 bg-transparent"
        >
          <option value="percent">{t('pos.percent') || 'نسبة %'}</option>
          <option value="fixed">{t('pos.fixed') || 'قيمة ثابتة'}</option>
        </select>
        <input
          dir="ltr"
          inputMode="decimal"
          type="number"
          className="ms-auto border rounded px-3 py-1 w-28 text-end"
          value={valueInput}
          onChange={(e) => setValueInput(e.target.value)}
        />
      </div>

      {!percentValid && (
        <div className="text-red-600 text-xs">{t('pos.percentBetweenZeroAndHundred') || 'النسبة يجب أن تكون بين 0 و 100.'}</div>
      )}
      {!fixedValid && (
        <div className="text-red-600 text-xs">{t('pos.discountExceedsSubtotal') || 'لا يمكن أن يتجاوز الخصم قيمة الإجمالي.'}</div>
      )}

      <div className="space-y-1 text-sm">
        <div className="flex items-center justify-between">
          <div className="text-muted-foreground">{t('pos.preDiscountTotal') || 'الإجمالي قبل الخصم'}</div>
          <div>{nf.format(subtotal)}</div>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-muted-foreground">
            {t('pos.discountValue') || 'قيمة الخصم'}
            {type === 'percent' && isValid && valueNum > 0 ? ` (%${valueNum})` : ''}
          </div>
          <div className="text-rose-600">-{nf.format(discountValue)}</div>
        </div>
        <div className="flex items-center justify-between font-semibold">
          <div>{t('pos.grandTotal') || 'الإجمالي النهائي'}</div>
          <div>{nf.format(grand)}</div>
        </div>
      </div>
    </div>
  );
}

