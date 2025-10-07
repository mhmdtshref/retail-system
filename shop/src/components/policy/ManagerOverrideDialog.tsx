"use client";
import { useState } from 'react';

export function ManagerOverrideDialog({ onToken, onClose }: { onToken: (t: string) => void; onClose: ()=>void }) {
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/auth/override', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ managerEmail: email, pinOrPassword: pin }) });
      const data = await res.json();
      if (!res.ok) { setError(data?.error?.message || 'مرفوض'); setLoading(false); return; }
      onToken(data.token);
      onClose();
    } catch {
      setError('فشل الاتصال');
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center">
      <form onSubmit={submit} className="w-96 bg-white rounded p-4 space-y-3" dir="rtl">
        <div className="font-semibold">يتطلب هذا الإجراء موافقة المدير.</div>
        <label className="block text-sm">
          بريد المدير
          <input className="mt-1 w-full border rounded px-3 py-2" type="email" dir="ltr" value={email} onChange={(e)=> setEmail(e.target.value)} required />
        </label>
        <label className="block text-sm">
          رقم PIN/كلمة المرور
          <input className="mt-1 w-full border rounded px-3 py-2" type="password" value={pin} onChange={(e)=> setPin(e.target.value)} required />
        </label>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <div className="flex gap-2 justify-end">
          <button type="button" className="px-3 py-2 rounded border" onClick={onClose}>إلغاء</button>
          <button disabled={loading} className="px-3 py-2 rounded bg-black text-white">تأكيد</button>
        </div>
      </form>
    </div>
  );
}
