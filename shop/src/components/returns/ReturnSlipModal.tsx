"use client";
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { enqueueReceiptlessReturn } from '@/lib/outbox';
import { uuid } from '@/lib/pos/idempotency';
import { usePosStore } from '@/lib/store/posStore';
import { ManagerOverrideDialog } from '@/components/policy/ManagerOverrideDialog';

export function ReturnSlipModal({ onClose }: { onClose: ()=>void }) {
  const t = useTranslations();
  const [amount, setAmount] = useState<string>("");
  const [method, setMethod] = useState<'CASH'|'CARD'|'STORE_CREDIT'>('CASH');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [inventoryAction, setInventoryAction] = useState<'NONE'|'PUT_BACK'|'WRITE_OFF'>('NONE');
  const [locationId, setLocationId] = useState<string>('');
  const [reference, setReference] = useState('');
  const [customerId, setCustomerId] = useState<string | undefined>(undefined);
  const [confirmAmount, setConfirmAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [policyHint, setPolicyHint] = useState<string>('');
  const [currency, setCurrency] = useState('SAR');
  const [showOverride, setShowOverride] = useState(false);
  const [pendingIdemp, setPendingIdemp] = useState<string | null>(null);
  const [pendingPayload, setPendingPayload] = useState<any | null>(null);

  const storeCustomerId = usePosStore((s: any) => s.customerId);
  useEffect(() => { if (storeCustomerId) setCustomerId(storeCustomerId || undefined); }, [storeCustomerId]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/settings/locales');
        if (res.ok) {
          const s = await res.json();
          setCurrency(s?.currency || 'SAR');
        }
      } catch {}
    })();
  }, []);

  const numericAmount = useMemo(() => {
    const a = Number(String(amount).replace(/[^0-9.]/g, ''));
    return isFinite(a) ? a : 0;
  }, [amount]);

  async function submit() {
    setError(null);
    const amt = numericAmount;
    if (!(amt > 0)) { setError('أدخل مبلغًا صالحًا'); return; }
    if (confirmAmount.trim() !== String(amt)) { setError('يرجى تأكيد المبلغ بكتابته مرة أخرى'); return; }
    setSubmitting(true);
    try {
      const payload = { amount: amt, currency, method, reason: reason || undefined, note: note || undefined, inventory: { action: inventoryAction, locationId: locationId || undefined, reference: reference || undefined }, customerId, attachments: [] as any[] };
      if (navigator.onLine) {
        const idemp = `receiptless:${uuid()}`;
        setPendingPayload(payload); setPendingIdemp(idemp);
        const res = await fetch('/api/returns/receiptless', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idemp }, body: JSON.stringify(payload) });
        if (res.status === 403) { setShowOverride(true); return; }
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        alert(t('receiptless.created') || 'تم إنشاء قسيمة الإرجاع. ستتم المزامنة عند توفر الإنترنت.');
        onClose();
        return;
      }
      // Offline path: enqueue to outbox
      const localId = uuid();
      await enqueueReceiptlessReturn({ localId, slip: payload });
      alert(t('receiptless.created') || 'تم إنشاء قسيمة الإرجاع. ستتم المزامنة عند توفر الإنترنت.');
      onClose();
    } catch (e) {
      setError('فشل إنشاء القسيمة');
    } finally { setSubmitting(false); }
  }

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/settings/returns');
        if (res.ok) {
          const s = await res.json();
          setPolicyHint(`سياسة الإرجاع: ${s.windowDays} يومًا`);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() === 'r') { e.preventDefault(); onClose(); setTimeout(()=>{},0); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center">
      <div className="w-[680px] max-w-[96vw] bg-white dark:bg-neutral-950 rounded p-4 space-y-3" dir="rtl">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">{t('receiptless.title') || 'إرجاع بدون فاتورة'}</div>
          <button className="px-2 py-1 rounded border" onClick={onClose}>{t('common.close') || 'إغلاق'}</button>
        </div>
        {policyHint && <div className="text-xs text-neutral-600">{policyHint}</div>}
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm">{t('receiptless.amount') || 'المبلغ'} ({currency})</span>
            <input inputMode="decimal" pattern="[0-9.,]*" className="border rounded px-3 py-2" value={amount} onChange={(e)=> setAmount(e.target.value)} placeholder="0.00" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm">{t('receiptless.method') || 'طريقة الاسترداد'}</span>
            <select className="border rounded px-3 py-2" value={method} onChange={(e)=> setMethod(e.target.value as any)}>
              <option value="CASH">نقدًا</option>
              <option value="CARD">بطاقة (يدوي)</option>
              <option value="STORE_CREDIT">رصيد متجر</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 col-span-2">
            <span className="text-sm">{t('receiptless.reason') || 'السبب'}</span>
            <input className="border rounded px-3 py-2" value={reason} onChange={(e)=> setReason(e.target.value)} placeholder="اختر/اكتب السبب" />
          </label>
          <label className="flex flex-col gap-1 col-span-2">
            <span className="text-sm">{t('receiptless.note') || 'ملاحظات'}</span>
            <textarea className="border rounded px-3 py-2" value={note} onChange={(e)=> setNote(e.target.value)} />
          </label>
          <div className="col-span-2 grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm">{t('receiptless.inventory') || 'المخزون'}</span>
              <select className="border rounded px-3 py-2" value={inventoryAction} onChange={(e)=> setInventoryAction(e.target.value as any)}>
                <option value="NONE">{t('receiptless.none') || 'بدون تغيير مخزون'}</option>
                <option value="PUT_BACK">{t('receiptless.putBack') || 'إرجاع للمخزون'}</option>
                <option value="WRITE_OFF">{t('receiptless.writeOff') || 'إتلاف'}</option>
              </select>
            </label>
            {inventoryAction !== 'NONE' && (
              <label className="flex flex-col gap-1">
                <span className="text-sm">الموقع/مرجع</span>
                <input className="border rounded px-3 py-2" value={locationId} onChange={(e)=> setLocationId(e.target.value)} placeholder="رمز الموقع" />
              </label>
            )}
            <label className="flex flex-col gap-1 col-span-2">
              <span className="text-sm">مرجع SKU/وصف (اختياري)</span>
              <input className="border rounded px-3 py-2" value={reference} onChange={(e)=> setReference(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 col-span-2">
              <span className="text-sm">{t('receiptless.customer') || 'العميل (اختياري)'}</span>
              <input className="border rounded px-3 py-2" value={customerId || ''} onChange={(e)=> setCustomerId(e.target.value || undefined)} placeholder="معرّف العميل" />
            </label>
          </div>
          <div className="col-span-2 rounded border p-3 space-y-2">
            <div className="text-sm">{t('receiptless.confirmAmount') || 'للتأكيد، اكتب المبلغ مرة أخرى'}</div>
            <input dir="ltr" className="border rounded px-3 py-2" value={confirmAmount} onChange={(e)=> setConfirmAmount(e.target.value)} placeholder="0.00" />
          </div>
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <div className="flex justify-end gap-2">
          <button className="px-3 py-2 rounded border" onClick={onClose}>إلغاء</button>
          <button disabled={submitting} className="px-4 py-2 rounded bg-green-600 text-white" onClick={submit}>تأكيد</button>
        </div>
      </div>
      {showOverride && (
        <ManagerOverrideDialog
          onToken={async (token) => {
            if (!pendingPayload || !pendingIdemp) return;
            try {
              const res = await fetch('/api/returns/receiptless', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': pendingIdemp, 'X-Override-Token': token }, body: JSON.stringify(pendingPayload) });
              if (!res.ok) { const data = await res.json().catch(()=>({})); setError(data?.error?.message || 'مرفوض'); return; }
              alert(t('receiptless.created') || 'تم إنشاء قسيمة الإرجاع. ستتم المزامنة عند توفر الإنترنت.');
              onClose();
            } finally {
              setShowOverride(false);
              setPendingPayload(null);
              setPendingIdemp(null);
            }
          }}
          onClose={() => { setShowOverride(false); }}
        />
      )}
    </div>
  );
}
