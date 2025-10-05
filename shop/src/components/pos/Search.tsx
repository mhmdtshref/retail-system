"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { posDb, ProductLite } from '@/lib/db/posDexie';
import { PosCartLine } from '@/lib/pos/types';
import { useTranslations } from 'next-intl';
import { VariantPicker } from './VariantPicker';
import { attachScanner, loadScannerConfig } from '@/lib/scanner/hid';

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
    <div className="w-full">
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('pos.searchPlaceholder') || 'ابحث برقم الباركود أو الاسم (F2)'}
        className="w-full border rounded px-3 py-2 outline-none focus:ring"
        dir="rtl"
      />
      <div className="mt-1 text-[10px] text-gray-500">
        {scannerActive ? 'قارئ الباركود متصل' : '—'}{scannerBuffer ? ` (${scannerBuffer})` : ''}
      </div>

      {query && (
        <div className="mt-2 max-h-64 overflow-auto rounded border divide-y bg-white dark:bg-black">
          {grouped.map(([code, variants]) => {
            const multiple = variants.length > 1;
            const first = variants[0];
            return (
              <button
                key={code}
                className="w-full text-right p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => {
                  if (multiple) {
                    setOpenPickerFor({ productCode: code, variants });
                  } else {
                    const v = first;
                    onAdd({ sku: v.sku, name: v.name_ar || v.name_en || v.sku, price: v.retailPrice, size: v.size, color: v.color });
                    setQuery('');
                  }
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate">
                    <div className="font-medium">{first.name_ar || first.name_en}</div>
                    <div className="text-xs text-gray-500">
                      {multiple ? (t('pos.pickVariant') || 'اختر المقاس/اللون') : [first.size, first.color].filter(Boolean).join(' / ')}
                    </div>
                  </div>
                  <div className="text-sm">{first.retailPrice.toFixed(2)}</div>
                </div>
              </button>
            );
          })}
          {grouped.length === 0 && (
            <div className="p-2 text-sm text-gray-500">{t('pos.noResults') || 'لا نتائج'}</div>
          )}
        </div>
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
    </div>
  );
}

