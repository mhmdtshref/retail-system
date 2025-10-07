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
              {p.method === 'card' && `طريقة الدفع: بطاقة`}
              {p.method === 'transfer' && `حوالة بنكية`}
              {p.method === 'store_credit' && `تم استخدام رصيد المتجر`}
              {p.meta?.reservationNote ? ` (${p.meta?.reservationNote})` : ''}
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
        {data.appliedDiscounts && data.appliedDiscounts.length > 0 && (
          <div className="mt-1">
            <div className="font-medium">التخفيضات</div>
            {data.appliedDiscounts.map((d) => (
              <div key={d.traceId} className="flex items-center justify-between text-xs">
                <div>{d.label}</div>
                <div>-{Number(d.amount || 0).toFixed(2)}</div>
              </div>
            ))}
            <div className="flex items-center justify-between text-xs">
              <div>إجمالي التوفير</div>
              <div>-{data.appliedDiscounts.reduce((s: number, a: any)=> s + (a.amount || 0), 0).toFixed(2)}</div>
            </div>
            {data.pendingCouponRedemption && (
              <div className="text-amber-700 text-xs mt-1">قيد التحقق من القسيمة</div>
            )}
          </div>
        )}
        {typeof data.totals.roundingAdj === 'number' && data.totals.roundingAdj !== 0 && (
          <div className="flex items-center justify-between text-xs">
            <div>تعديل التقريب</div>
            <div>{data.totals.roundingAdj > 0 ? '+' : ''}{data.totals.roundingAdj.toFixed(2)}</div>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="font-medium">الإجمالي النهائي</div>
          <div className="font-medium">{data.totals.grand.toFixed(2)}</div>
        </div>
        {data.totals.taxByRate && data.totals.taxByRate.length > 0 && (
          <div className="mt-2 text-[11px]">
            <div className="font-medium">ملخص الضريبة حسب النسبة</div>
            {data.totals.taxByRate.map((r)=> (
              <div key={r.rate} className="flex items-center justify-between">
                <div>{Math.round(r.rate*100)}%</div>
                <div>{r.taxable.toFixed(2)} / {r.tax.toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}
        {data.totals.priceMode === 'tax_inclusive' && (
          <div className="text-[11px] text-neutral-600">الأسعار تشمل الضريبة</div>
        )}
      </div>
      {data.paymentPlan?.mode === 'partial' && (
        <div className="mt-2">
          <div className="font-medium">تفاصيل التقسيط</div>
          <div className="flex items-center justify-between text-xs">
            <div>الدفعة المقدمة</div>
            <div>{data.paymentPlan.downPayment.toFixed(2)}</div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <div>المتبقي</div>
            <div>{data.paymentPlan.remaining.toFixed(2)}</div>
          </div>
          {data.paymentPlan.expiresAt && (
            <div className="text-xs">البضاعة محجوزة حتى {new Date(data.paymentPlan.expiresAt).toLocaleDateString()}</div>
          )}
          {data.paymentPlan.schedule && data.paymentPlan.schedule.length > 0 && (
            <div className="mt-1 border rounded p-1 text-[11px]">
              {data.paymentPlan.schedule.map((s) => (
                <div key={s.seq} className="flex justify-between">
                  <div>#{s.seq}</div>
                  <div dir="ltr">{new Date(s.dueDate).toLocaleDateString()}</div>
                  <div>{s.amount.toFixed(2)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {data.offlinePending && (
        <div className="mt-2 text-amber-700">سيتم مزامنة الفاتورة عند توفر الاتصال</div>
      )}
    </div>
  );
}

