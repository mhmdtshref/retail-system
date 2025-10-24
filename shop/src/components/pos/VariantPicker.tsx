"use client";
import { useMemo, useState } from 'react';
import { ProductLite } from '@/lib/db/posDexie';
import { useTranslations } from 'next-intl';
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';

type Props = {
  productName: string;
  variants: ProductLite[];
  onClose: () => void;
  onConfirm: (variant: ProductLite) => void;
};

export function VariantPicker({ productName, variants, onClose, onConfirm }: Props) {
  const t = useTranslations();
  const sizes = useMemo(() => Array.from(new Set(variants.map(v => v.size).filter(Boolean))) as string[], [variants]);
  const colors = useMemo(() => Array.from(new Set(variants.map(v => v.color).filter(Boolean))) as string[], [variants]);
  const [selectedSize, setSelectedSize] = useState<string | undefined>(sizes[0]);
  const [selectedColor, setSelectedColor] = useState<string | undefined>(colors[0]);

  const candidate = variants.find(v => (selectedSize ? v.size === selectedSize : true) && (selectedColor ? v.color === selectedColor : true)) || variants[0];

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{productName}</DialogTitle>
      <DialogContent>
        {sizes.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>{t('pos.size') || 'المقاس'}</Typography>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {sizes.map(s => (
                <Chip key={s} label={s} color={selectedSize===s? 'primary': 'default'} onClick={() => setSelectedSize(s)} variant={selectedSize===s? 'filled':'outlined'} />
              ))}
            </Stack>
          </Box>
        )}
        {colors.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>{t('pos.color') || 'اللون'}</Typography>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {colors.map(c => (
                <Chip key={c} label={c} color={selectedColor===c? 'primary': 'default'} onClick={() => setSelectedColor(c)} variant={selectedColor===c? 'filled':'outlined'} />
              ))}
            </Stack>
          </Box>
        )}
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary"><bdi dir="ltr">{candidate?.sku}</bdi></Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.close') || 'إغلاق'}</Button>
        <Button onClick={() => candidate && onConfirm(candidate)} variant="contained" color="success">{t('common.confirm') || 'تأكيد'}</Button>
      </DialogActions>
    </Dialog>
  );
}

