"use client";
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { usePosStore } from '@/lib/store/posStore';
import { evaluateTaxForPos } from '@/lib/tax/local';

type Props = {
  total: number;
  onConfirmCash: (amount: number, meta?: { receivedCash?: number }) => void;
  onConfirmCard: (amount: number) => void;
  onConfirmPartial: (downPayment: number, meta: { reservationNote?: string; plan?: { count: number; intervalDays: number; schedule: Array<{ seq: number; dueDate: string; amount: number }> } }) => void;
  onClose: () => void;
};

export function PayModal({ total, onConfirmCash, onConfirmCard, onConfirmPartial, onClose }: Props) {
  const t = useTranslations();
  const [tab, setTab] = useState<'cash'|'card'|'partial'|'store_credit'>('cash');
  const [cash, setCash] = useState(total);
  const [cardAmount, setCardAmount] = useState(total);
  const [partial, setPartial] = useState(Math.max(1, Math.round(total * 0.1)));
  const [note, setNote] = useState('');
  const [installments, setInstallments] = useState(2);
  const [intervalDays, setIntervalDays] = useState(14);
  const [schedule, setSchedule] = useState<Array<{ seq: number; dueDate: string; amount: number }>>([]);
  const [storeCreditAmount, setStoreCreditAmount] = useState(0);
  const [availableCredit, setAvailableCredit] = useState<number | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const minPartial = Math.ceil(total * 0.1);

  const lines = usePosStore((s: any) => s.lines);
  const appliedDiscounts = usePosStore((s: any) => s.appliedDiscounts);
  const [cashRoundedTotal, setCashRoundedTotal] = useState<number>(total);
  const [cashRoundingAdj, setCashRoundingAdj] = useState<number>(0);

  useEffect(() => {
    (async () => {
      try {
        const res = await evaluateTaxForPos(lines as any[], appliedDiscounts as any[], { paymentMethod: 'cash' });
        setCashRoundedTotal(res.totals.grandTotal);
        setCashRoundingAdj(res.totals.roundingAdj || 0);
        setCash(res.totals.grandTotal);
      } catch {}
    })();
  }, [lines, appliedDiscounts]);

  const validCash = cash >= total && cash > 0;
  const validCard = cardAmount > 0;
  const validPartial = partial >= minPartial && partial < total;
  const validStoreCredit = storeCreditAmount > 0 && storeCreditAmount <= (availableCredit ?? 0) && storeCreditAmount <= total;

  const generateSchedule = () => {
    const remaining = Math.max(0, total - partial);
    const n = Math.max(1, installments);
    const base = Math.floor((remaining / n) * 100) / 100;
    const out: Array<{ seq: number; dueDate: string; amount: number }> = [];
    const today = new Date();
    let acc = 0;
    for (let i = 1; i <= n; i++) {
      const due = new Date(today.getTime() + i * intervalDays * 24 * 60 * 60 * 1000);
      const amt = i === n ? Math.round((remaining - acc) * 100) / 100 : base;
      acc += amt;
      out.push({ seq: i, dueDate: due.toISOString(), amount: amt });
    }
    setSchedule(out);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end">
      <div className="w-full bg-white dark:bg-neutral-900 rounded-t-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <button className={`px-3 py-1 rounded ${tab==='cash'?'bg-blue-600 text-white':'border'}`} onClick={() => setTab('cash')}>{t('pos.cash') || 'نقدًا'}</button>
          <button className={`px-3 py-1 rounded ${tab==='card'?'bg-blue-600 text-white':'border'}`} onClick={() => setTab('card')}>{t('pos.card') || 'بطاقة'}</button>
          <button className={`px-3 py-1 rounded ${tab==='partial'?'bg-blue-600 text-white':'border'}`} onClick={() => setTab('partial')}>{t('pos.partial') || 'تقسيط'}</button>
          <button className={`px-3 py-1 rounded ${tab==='store_credit'?'bg-blue-600 text-white':'border'}`} onClick={() => setTab('store_credit')}>{t('pos.storeCredit') || 'رصيد المتجر'}</button>
          <button className="ms-auto text-sm" onClick={onClose}>{t('common.close') || 'إغلاق'}</button>
        </div>

        {tab === 'cash' && (
          <div className="space-y-3">
            <div className="text-sm">{t('pos.total')}: {cashRoundedTotal.toFixed(2)}</div>
            {typeof cashRoundingAdj === 'number' && cashRoundingAdj !== 0 && (
              <div className="text-xs text-neutral-600">تعديل التقريب: {cashRoundingAdj > 0 ? '+' : ''}{cashRoundingAdj.toFixed(2)}</div>
            )}
            <input type="number" value={cash} onChange={(e)=> setCash(Number(e.target.value))} className="w-full border rounded px-3 py-2" dir="ltr" />
            <button disabled={!validCash} className={`px-4 py-2 rounded ${validCash?'bg-emerald-600 text-white':'bg-gray-200 text-gray-500'}`} onClick={()=> onConfirmCash(cash, { receivedCash: cash })}>
              {t('common.confirm') || 'تأكيد'}
            </button>
          </div>
        )}

        {tab === 'card' && (
          <div className="space-y-3">
            <input type="number" value={cardAmount} onChange={(e)=> setCardAmount(Number(e.target.value))} className="w-full border rounded px-3 py-2" dir="ltr" placeholder={t('pos.amount') || 'المبلغ'} />
            <button disabled={!validCard} className={`px-4 py-2 rounded ${validCard?'bg-emerald-600 text-white':'bg-gray-200 text-gray-500'}`} onClick={()=> onConfirmCard(cardAmount)}>
              {t('common.confirm') || 'تأكيد'}
            </button>
          </div>
        )}

        {tab === 'partial' && (
          <div className="space-y-3">
            <div className="text-sm">{t('pos.minDownPayment') || 'الدفعة الأدنى'}: {minPartial.toFixed(2)}</div>
            <input type="number" value={partial} onChange={(e)=> setPartial(Number(e.target.value))} className="w-full border rounded px-3 py-2" dir="ltr" placeholder={t('pos.downPayment') || 'الدفعة المقدمة'} />
            <input value={note} onChange={(e)=> setNote(e.target.value)} className="w-full border rounded px-3 py-2" placeholder={t('pos.reservationNote') || 'ملاحظة الحجز'} />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs block mb-1">{t('pos.installmentsCount') || 'عدد الأقساط'}</label>
                <input type="number" min={1} value={installments} onChange={(e)=> setInstallments(Number(e.target.value))} className="w-full border rounded px-2 py-1" dir="ltr" />
              </div>
              <div>
                <label className="text-xs block mb-1">{t('pos.intervalDays') || 'فاصل الأيام'}</label>
                <input type="number" min={1} value={intervalDays} onChange={(e)=> setIntervalDays(Number(e.target.value))} className="w-full border rounded px-2 py-1" dir="ltr" />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" className="px-3 py-1 rounded border" onClick={generateSchedule}>{t('pos.generatePlan') || 'توليد خطة'}</button>
              <div className="text-sm text-neutral-600">
                {(schedule && schedule.length>0) ? `${t('pos.installments') || 'أقساط'}: ${schedule.length}` : t('pos.noPlan') || 'بدون خطة'}
              </div>
            </div>
            {schedule && schedule.length > 0 && (
              <div className="max-h-28 overflow-auto border rounded p-2 text-xs">
                {schedule.map((s) => (
                  <div key={s.seq} className="flex justify-between">
                    <div>#{s.seq}</div>
                    <div dir="ltr">{new Date(s.dueDate).toLocaleDateString()}</div>
                    <div>{s.amount.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            )}
            <button disabled={!validPartial} className={`px-4 py-2 rounded ${validPartial?'bg-emerald-600 text-white':'bg-gray-200 text-gray-500'}`} onClick={()=> onConfirmPartial(partial, { reservationNote: note, plan: schedule.length>0 ? { count: installments, intervalDays, schedule } : undefined })}>
              {t('common.confirm') || 'تأكيد'}
            </button>
          </div>
        )}

        {tab === 'store_credit' && (
          <div className="space-y-3">
            <div className="text-sm">{t('pos.availableCredit') || 'الرصيد المتاح'}: {availableCredit == null ? '—' : availableCredit.toFixed(2)}</div>
            <input type="number" value={storeCreditAmount} onChange={(e)=> setStoreCreditAmount(Number(e.target.value))} className="w-full border rounded px-3 py-2" dir="ltr" placeholder={t('pos.amount') || 'المبلغ'} />
            <button disabled={!validStoreCredit} className={`px-4 py-2 rounded ${validStoreCredit?'bg-emerald-600 text-white':'bg-gray-200 text-gray-500'}`} onClick={()=> {
              // Let POS page handle adding payment via store credit by closing and emitting a custom event
              const ev = new CustomEvent('pos:applyStoreCredit', { detail: { amount: storeCreditAmount } });
              window.dispatchEvent(ev);
              onClose();
            }}>
              {t('common.apply') || 'تطبيق'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

