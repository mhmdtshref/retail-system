"use client";
import { ReceiptData } from '@/lib/pos/types';

export function Receipt({ data }: { data: ReceiptData }) {
  return (
    <div dir="rtl" className="receipt w-[80mm] mx-auto text-sm">
      <div className="text-center font-semibold mb-2">الإيصال</div>
      <div className="space-y-1">
        {data.lines.map((l) => (
          <div key={l.sku} className="flex items-center justify-between">
            <div className="truncate">
              {l.name}{(l.size || l.color) ? ` (${[l.size, l.color].filter(Boolean).join(', ')})` : ''}
            </div>
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
              {p.method === 'card' && `دفع بالبطاقة ${p.meta?.cardLast4 ? `(**** ${p.meta.cardLast4})` : ''}${p.meta?.authCode ? ` - ${p.meta.authCode}` : ''}`}
              {p.method === 'partial' && `دفعة مقدّمة (${p.meta?.reservationNote || 'حجز'})`}
            </div>
            <div>{p.amount.toFixed(2)}</div>
          </div>
        ))}
      </div>
      <hr className="my-2" />
      <div className="flex items-center justify-between">
        <div className="font-medium">الإجمالي</div>
        <div className="font-medium">{data.totals.grand.toFixed(2)}</div>
      </div>
      {data.offlinePending && (
        <div className="mt-2 text-amber-700">سيتم مزامنة الفاتورة عند توفر الاتصال</div>
      )}
    </div>
  );
}

