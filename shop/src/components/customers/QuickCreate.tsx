"use client";
import { useState } from 'react';
import { normalizeToE164 } from '@/lib/phone';
import { posDb } from '@/lib/db/posDexie';
import { enqueueCustomerCreate } from '@/lib/outbox';

type Props = { onCreated: (c: any) => void };

export function QuickCreate({ onCreated }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    const full = name.trim();
    if (!full) { setError('الاسم مطلوب'); return; }
    const { e164, digits } = normalizeToE164(phone || '', { defaultCountry: 'SA' });
    const payload: any = { fullName_ar: full, phones: e164 ? [{ e164, raw: phone, primary: true }] : [] };
    try {
      setPending(true);
      if (!navigator.onLine) {
        try { await posDb.customerDrafts.put({ localId: crypto.randomUUID(), payload, createdAt: Date.now() }); } catch {}
        await enqueueCustomerCreate(payload);
        onCreated({ _id: undefined, fullName_ar: full, phones: payload.phones, offlinePending: true });
        setPending(false);
        return;
      }
      const res = await fetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `customer:${Date.now()}:${Math.random()}` }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      onCreated(data.customer);
    } catch (e: any) {
      setError(e?.message || 'فشل الإنشاء');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="text-sm">إنشاء سريع</div>
      <input className="w-full border rounded px-2 py-1" placeholder="الاسم الكامل" value={name} onChange={(e)=> setName(e.target.value)} />
      <input className="w-full border rounded px-2 py-1" placeholder="رقم الجوال" dir="ltr" value={phone} onChange={(e)=> setPhone(e.target.value)} />
      {error && <div className="text-rose-600 text-xs">{error}</div>}
      <button className="px-3 py-1.5 rounded bg-emerald-600 text-white disabled:opacity-50" disabled={pending} onClick={submit}>حفظ</button>
    </div>
  );
}

