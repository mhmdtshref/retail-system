"use client";
import { ReceiptData } from '@/lib/pos/types';

export function ReceiptPreview({ data, template }: { data: ReceiptData; template: any }) {
  return (
    <div className="border rounded p-3 bg-white">
      <div className={template === 'a4' ? 'w-[595px] mx-auto' : 'w-[80mm] mx-auto'} dir="rtl">
        <div className="text-center font-semibold mb-2">الإيصال</div>
        <div className="space-y-1">
          {data.lines.map((l) => (
            <div key={l.sku} className="flex items-center justify-between">
              <div className="truncate">{l.name}{(l.size || l.color) ? ` (${[l.size, l.color].filter(Boolean).join(', ')})` : ''}</div>
              <div>{l.qty} × {l.price.toFixed(2)}</div>
            </div>
          ))}
        </div>
        <hr className="my-2" />
        <div className="space-y-1">
          {data.payments.map((p) => (
            <div key={p.seq} className="flex items-center justify-between text-xs">
              <div>
                {p.method === 'cash' && 'دفع نقدًا'}
                {p.method === 'card' && `بطاقة`}
                {p.method === 'transfer' && `حوالة`} 
                {p.method === 'store_credit' && `رصيد المتجر`}
              </div>
              <div>{p.amount.toFixed(2)}</div>
            </div>
          ))}
        </div>
        <hr className="my-2" />
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div>المجموع قبل الضريبة</div>
            <div>{data.totals.subtotal.toFixed(2)}</div>
          </div>
          <div className="flex items-center justify-between">
            <div>الضريبة</div>
            <div>{data.totals.tax.toFixed(2)}</div>
          </div>
          <div className="flex items-center justify-between">
            <div className="font-medium">الإجمالي النهائي</div>
            <div className="font-medium">{data.totals.grand.toFixed(2)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

