"use client";
import { useMemo, useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { usePosStore } from '@/lib/store/posStore';
import type { Discount } from '@/lib/pos/types';
import { MANUAL_DISCOUNT_LIMIT } from '@/lib/policy/policies';
import { getCachedSettings } from '@/lib/offline/settings-cache';
import { Alert, Box, MenuItem, Paper, Select, SelectChangeEvent, Stack, TextField, Typography } from '@mui/material';

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
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography fontWeight={600}>{t('pos.discount') || 'الخصم'}</Typography>
        <Select size="small" value={type} onChange={(e: SelectChangeEvent) => setType(e.target.value as Discount['type'])}>
          <MenuItem value="percent">{t('pos.percent') || 'نسبة %'}</MenuItem>
          <MenuItem value="fixed">{t('pos.fixed') || 'قيمة ثابتة'}</MenuItem>
        </Select>
        <TextField
          inputProps={{ dir: 'ltr' }}
          inputMode="decimal"
          type="number"
          size="small"
          sx={{ marginInlineStart: 'auto', width: 120 }}
          value={valueInput}
          onChange={(e) => setValueInput(e.target.value)}
        />
      </Stack>

      {!percentValid && (
        <Alert severity="error" variant="outlined" sx={{ mt: 1, '& .MuiAlert-message': { fontSize: 12 } }}>{t('pos.percentBetweenZeroAndHundred') || 'النسبة يجب أن تكون بين 0 و 100.'}</Alert>
      )}
      {!fixedValid && (
        <Alert severity="error" variant="outlined" sx={{ mt: 1, '& .MuiAlert-message': { fontSize: 12 } }}>{t('pos.discountExceedsSubtotal') || 'لا يمكن أن يتجاوز الخصم قيمة الإجمالي.'}</Alert>
      )}

      <Box sx={{ mt: 1, fontSize: 14 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography color="text.secondary">{t('pos.preDiscountTotal') || 'الإجمالي قبل الخصم'}</Typography>
          <Typography>{nf.format(subtotal)}</Typography>
        </Stack>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography color="text.secondary">
            {t('pos.discountValue') || 'قيمة الخصم'}
            {type === 'percent' && isValid && valueNum > 0 ? ` (%${valueNum})` : ''}
          </Typography>
          <Typography color="error">-{nf.format(discountValue)}</Typography>
        </Stack>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ fontWeight: 600 }}>
          <Typography>{t('pos.grandTotal') || 'الإجمالي النهائي'}</Typography>
          <Typography>{nf.format(grand)}</Typography>
        </Stack>
      </Box>
    </Paper>
  );
}

