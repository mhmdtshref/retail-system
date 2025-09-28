"use client";
import { useMemo, useState } from 'react';
import { ProductLite } from '@/lib/db/posDexie';
import { useTranslations } from 'next-intl';

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
    <div className="fixed inset-0 z-50 flex items-end bg-black/40">
      <div className="w-full rounded-t-2xl bg-white dark:bg-neutral-900 p-4 border-t">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">{productName}</div>
          <button onClick={onClose} className="text-sm">{t('common.close') || 'إغلاق'}</button>
        </div>
        {sizes.length > 0 && (
          <div className="mb-3">
            <div className="text-sm mb-1">{t('pos.size') || 'المقاس'}</div>
            <div className="flex flex-wrap gap-2">
              {sizes.map(s => (
                <button key={s} onClick={() => setSelectedSize(s)} className={`px-3 py-1 rounded border ${selectedSize===s? 'bg-blue-600 text-white border-blue-600':'bg-transparent'}`}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {colors.length > 0 && (
          <div className="mb-3">
            <div className="text-sm mb-1">{t('pos.color') || 'اللون'}</div>
            <div className="flex flex-wrap gap-2">
              {colors.map(c => (
                <button key={c} onClick={() => setSelectedColor(c)} className={`px-3 py-1 rounded border ${selectedColor===c? 'bg-blue-600 text-white border-blue-600':'bg-transparent'}`}>{c}</button>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-500"><bdi dir="ltr">{candidate?.sku}</bdi></div>
          <button className="px-4 py-2 rounded bg-emerald-600 text-white" onClick={() => candidate && onConfirm(candidate)}>
            {t('common.confirm') || 'تأكيد'}
          </button>
        </div>
      </div>
    </div>
  );
}

