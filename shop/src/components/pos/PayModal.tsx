"use client";
import { useState } from 'react';
import { useTranslations } from 'next-intl';

type Props = {
  total: number;
  onConfirmCash: (amount: number, meta?: { receivedCash?: number }) => void;
  onConfirmCard: (amount: number, meta: { cardLast4: string; authCode: string }) => void;
  onConfirmPartial: (amount: number, meta: { reservationNote?: string }) => void;
  onClose: () => void;
};

export function PayModal({ total, onConfirmCash, onConfirmCard, onConfirmPartial, onClose }: Props) {
  const t = useTranslations();
  const [tab, setTab] = useState<'cash'|'card'|'partial'>('cash');
  const [cash, setCash] = useState(total);
  const [cardAmount, setCardAmount] = useState(total);
  const [last4, setLast4] = useState('');
  const [auth, setAuth] = useState('');
  const [partial, setPartial] = useState(Math.max(1, Math.round(total * 0.1)));
  const [note, setNote] = useState('');
  const minPartial = Math.ceil(total * 0.1);

  const validCash = cash >= total && cash > 0;
  const validCard = cardAmount > 0 && last4.length === 4 && auth.length >= 4;
  const validPartial = partial >= minPartial;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end">
      <div className="w-full bg-white dark:bg-neutral-900 rounded-t-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <button className={`px-3 py-1 rounded ${tab==='cash'?'bg-blue-600 text-white':'border'}`} onClick={() => setTab('cash')}>{t('pos.cash') || 'نقدًا'}</button>
          <button className={`px-3 py-1 rounded ${tab==='card'?'bg-blue-600 text-white':'border'}`} onClick={() => setTab('card')}>{t('pos.card') || 'بطاقة'}</button>
          <button className={`px-3 py-1 rounded ${tab==='partial'?'bg-blue-600 text-white':'border'}`} onClick={() => setTab('partial')}>{t('pos.partial') || 'تقسيط'}</button>
          <button className="ms-auto text-sm" onClick={onClose}>{t('common.close') || 'إغلاق'}</button>
        </div>

        {tab === 'cash' && (
          <div className="space-y-3">
            <div className="text-sm">{t('pos.total')}: {total.toFixed(2)}</div>
            <input type="number" value={cash} onChange={(e)=> setCash(Number(e.target.value))} className="w-full border rounded px-3 py-2" dir="ltr" />
            <button disabled={!validCash} className={`px-4 py-2 rounded ${validCash?'bg-emerald-600 text-white':'bg-gray-200 text-gray-500'}`} onClick={()=> onConfirmCash(cash, { receivedCash: cash })}>
              {t('common.confirm') || 'تأكيد'}
            </button>
          </div>
        )}

        {tab === 'card' && (
          <div className="space-y-3">
            <input type="number" value={cardAmount} onChange={(e)=> setCardAmount(Number(e.target.value))} className="w-full border rounded px-3 py-2" dir="ltr" placeholder={t('pos.amount') || 'المبلغ'} />
            <input value={last4} onChange={(e)=> setLast4(e.target.value.slice(0,4))} className="w-full border rounded px-3 py-2" dir="ltr" placeholder={t('pos.cardLast4') || 'آخر 4 أرقام'} />
            <input value={auth} onChange={(e)=> setAuth(e.target.value)} className="w-full border rounded px-3 py-2" dir="ltr" placeholder={t('pos.authCode') || 'رمز التفويض'} />
            <button disabled={!validCard} className={`px-4 py-2 rounded ${validCard?'bg-emerald-600 text-white':'bg-gray-200 text-gray-500'}`} onClick={()=> onConfirmCard(cardAmount, { cardLast4: last4, authCode: auth })}>
              {t('common.confirm') || 'تأكيد'}
            </button>
          </div>
        )}

        {tab === 'partial' && (
          <div className="space-y-3">
            <div className="text-sm">{t('pos.minDownPayment') || 'الدفعة الأدنى'}: {minPartial.toFixed(2)}</div>
            <input type="number" value={partial} onChange={(e)=> setPartial(Number(e.target.value))} className="w-full border rounded px-3 py-2" dir="ltr" placeholder={t('pos.downPayment') || 'الدفعة المقدمة'} />
            <input value={note} onChange={(e)=> setNote(e.target.value)} className="w-full border rounded px-3 py-2" placeholder={t('pos.reservationNote') || 'ملاحظة الحجز'} />
            <button disabled={!validPartial} className={`px-4 py-2 rounded ${validPartial?'bg-emerald-600 text-white':'bg-gray-200 text-gray-500'}`} onClick={()=> onConfirmPartial(partial, { reservationNote: note })}>
              {t('common.confirm') || 'تأكيد'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

