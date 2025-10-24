"use client";
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { usePosStore } from '@/lib/store/posStore';
import type { PosCartLine } from '@/lib/pos/types';
import { Box, Chip, IconButton, Paper, Stack, Typography } from '@mui/material';
import { Add, Remove, DeleteOutline } from '@mui/icons-material';
import { ConfirmDialog } from '@/components/mui/ConfirmDialog';

export function Cart() {
  const t = useTranslations();
  const lines = usePosStore((s: any) => s.lines);
  const updateQty = usePosStore((s: any) => s.updateQty);
  const removeLine = usePosStore((s: any) => s.removeLine);
  const total = useMemo(() => (lines as PosCartLine[]).reduce((sum: number, l: PosCartLine) => sum + l.qty * l.price, 0), [lines]);
  const [confirmSku, setConfirmSku] = useState<string | null>(null);

  return (
    <Stack spacing={1.5}>
      {(lines as PosCartLine[]).map((l: PosCartLine) => (
        <Paper key={l.sku} variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography noWrap fontWeight={600}>{l.name}</Typography>
              <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 0.5 }}>
                {l.size && <Chip variant="outlined" size="small" label={`${t('pos.size') || 'المقاس'}: ${l.size}`} />}
                {l.color && <Chip variant="outlined" size="small" label={`${t('pos.color') || 'اللون'}: ${l.color}`} />}
                <Typography variant="caption" color="text.secondary">{l.sku}</Typography>
              </Stack>
            </Box>
            <Typography sx={{ width: 96, textAlign: 'end', fontWeight: 600 }}>{(l.qty * l.price).toFixed(2)}</Typography>
          </Stack>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1.5 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <IconButton size="small" onClick={() => updateQty(l.sku, Math.max(1, l.qty - 1))} aria-label="decrement"><Remove /></IconButton>
              <Typography sx={{ width: 24, textAlign: 'center' }} aria-live="polite">{l.qty}</Typography>
              <IconButton size="small" onClick={() => updateQty(l.sku, l.qty + 1)} aria-label="increment"><Add /></IconButton>
            </Stack>
            <IconButton color="error" aria-label={t('common.remove') || 'حذف'} onClick={() => setConfirmSku(l.sku)}>
              <DeleteOutline />
            </IconButton>
          </Stack>
        </Paper>
      ))}
      {lines.length === 0 && (
        <Typography color="text.secondary" sx={{ p: 1 }}>—</Typography>
      )}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 1 }}>
        <Typography fontWeight={600}>{t('pos.subtotal') || 'الإجمالي الفرعي'}</Typography>
        <Typography fontWeight={600}>{total.toFixed(2)}</Typography>
      </Stack>

      <ConfirmDialog
        open={!!confirmSku}
        title={t('common.remove') || 'حذف العنصر'}
        description={t('pos.removeLineConfirm') || 'هل تريد حذف هذا العنصر من السلة؟'}
        onClose={() => setConfirmSku(null)}
        onConfirm={() => { if (confirmSku) removeLine(confirmSku); setConfirmSku(null); }}
        confirmColor="error"
        confirmLabel={t('common.remove') || 'حذف'}
        cancelLabel={t('common.cancel') || 'إلغاء'}
      />
    </Stack>
  );
}

