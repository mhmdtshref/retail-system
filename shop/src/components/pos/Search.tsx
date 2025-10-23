"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { posDb, ProductLite } from '@/lib/db/posDexie';
import { PosCartLine } from '@/lib/pos/types';
import { useTranslations } from 'next-intl';
import { VariantPicker } from './VariantPicker';
import { attachScanner, loadScannerConfig } from '@/lib/scanner/hid';
import { Box, ButtonBase, Paper, Stack, TextField, Typography } from '@mui/material';

type Props = {
  onAdd: (line: Omit<PosCartLine, 'qty'> & { qty?: number }) => void;
};

export function Search({ onAdd }: Props) {
  const t = useTranslations();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState('');
  const [all, setAll] = useState<ProductLite[]>([]);
  const [openPickerFor, setOpenPickerFor] = useState<{ productCode: string; variants: ProductLite[] } | null>(null);
  const [scannerActive, setScannerActive] = useState(false);
  const [scannerBuffer, setScannerBuffer] = useState('');

  useEffect(() => {
    (async () => {
      const items = await posDb.products.toArray();
      setAll(items);
    })();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const detach = attachScanner({
      beep: true,
      onScan: (code) => {
        // Lookup by barcode or sku
        const lc = code.trim().toLowerCase();
        const found = all.find((p) => (p.barcode && p.barcode.toLowerCase() === lc) || p.sku.toLowerCase() === lc);
        if (found) {
          onAdd({ sku: found.sku, name: found.name_ar || found.name_en || found.sku, price: found.retailPrice, size: found.size, color: found.color });
          setQuery('');
        } else {
          // fallback to show in search box
          setQuery(code);
        }
      },
      onState: (s) => { setScannerActive(s.active); setScannerBuffer(s.buffer); },
    }, loadScannerConfig());
    return () => { detach(); };
  }, [all, onAdd]);

  const results = useMemo((): ProductLite[] => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as ProductLite[];
    return all.filter((p: ProductLite) =>
      [p.barcode, p.sku, p.name_ar, p.name_en].some((v) => (v || '').toLowerCase().includes(q))
    ).slice(0, 25);
  }, [query, all]);

  const grouped = useMemo((): Array<[string, ProductLite[]]> => {
    const groups = new Map<string, ProductLite[]>();
    for (const r of results as ProductLite[]) {
      const key = r.productCode || r.sku;
      const arr = groups.get(key) || [];
      arr.push(r);
      groups.set(key, arr);
    }
    return Array.from(groups.entries());
  }, [results]);

  return (
    <Box sx={{ width: '100%' }}>
      <TextField
        inputRef={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('pos.searchPlaceholder') || 'ابحث برقم الباركود أو الاسم (F2)'}
        fullWidth
        size="small"
        inputProps={{ dir: 'rtl' }}
      />
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
        {scannerActive ? 'قارئ الباركود متصل' : '—'}{scannerBuffer ? ` (${scannerBuffer})` : ''}
      </Typography>

      {query && (
        <Paper variant="outlined" sx={{ mt: 1, maxHeight: 256, overflow: 'auto' }}>
          {grouped.map(([code, variants]) => {
            const multiple = variants.length > 1;
            const first = variants[0];
            return (
              <ButtonBase
                key={code}
                onClick={() => {
                  if (multiple) {
                    setOpenPickerFor({ productCode: code, variants });
                  } else {
                    const v = first;
                    onAdd({ sku: v.sku, name: v.name_ar || v.name_en || v.sku, price: v.retailPrice, size: v.size, color: v.color });
                    setQuery('');
                  }
                }}
                sx={{ width: '100%', textAlign: 'right', p: 1, '&:not(:last-of-type)': { borderBottom: (t)=> `1px solid ${t.palette.divider}` } }}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ width: '100%' }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography noWrap fontWeight={600}>{first.name_ar || first.name_en}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {multiple ? (t('pos.pickVariant') || 'اختر المقاس/اللون') : [first.size, first.color].filter(Boolean).join(' / ')}
                    </Typography>
                  </Box>
                  <Typography fontSize={14}>{first.retailPrice.toFixed(2)}</Typography>
                </Stack>
              </ButtonBase>
            );
          })}
          {grouped.length === 0 && (
            <Box sx={{ p: 1 }}>
              <Typography color="text.secondary" fontSize={14}>{t('pos.noResults') || 'لا نتائج'}</Typography>
            </Box>
          )}
        </Paper>
      )}

      {openPickerFor && (
        <VariantPicker
          productName={openPickerFor.variants[0]?.name_ar || openPickerFor.variants[0]?.name_en || ''}
          variants={openPickerFor.variants}
          onClose={() => setOpenPickerFor(null)}
          onConfirm={(v) => {
            onAdd({ sku: v.sku, name: v.name_ar || v.name_en || v.sku, price: v.retailPrice, size: v.size, color: v.color });
            setOpenPickerFor(null);
            setQuery('');
          }}
        />
      )}
    </Box>
  );
}

