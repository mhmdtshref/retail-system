"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export const metadata = {
  title: 'تتبع الطلب',
  description: 'تحقق من حالة طلبك وشحناتك.',
  robots: { index: false, follow: false },
  openGraph: { title: 'تتبع الطلب', description: 'تحقق من حالة طلبك وشحناتك.' }
} as const;

export default function TrackLookupPage() {
  const [orderCode, setOrderCode] = useState('');
  const [contact, setContact] = useState('');
  const [otp, setOtp] = useState('');
  const [pendingOtp, setPendingOtp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugOtp, setDebugOtp] = useState<string | undefined>(undefined);
  const router = useRouter();

  async function submitLookup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const res = await fetch('/api/public/track/lookup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderCode, emailOrPhone: contact }) });
    const data = await res.json();
    if (!res.ok) { setError(data?.error || 'خطأ'); return; }
    if (data.pendingOtp) { setPendingOtp(true); setDebugOtp(data.debugOtp); }
  }

  async function submitOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const res = await fetch('/api/public/track/verify-otp', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderCode, otp }) });
    const data = await res.json();
    if (!res.ok) { setError(data?.error || 'خطأ'); return; }
    router.push(`/track/${data.orderId}?t=${encodeURIComponent(data.trackToken)}`);
  }

  return (
    <div className="max-w-md mx-auto p-4" dir="rtl">
      <h1 className="text-xl font-semibold mb-4">تتبع الطلب</h1>
      {!pendingOtp ? (
        <form onSubmit={submitLookup} className="space-y-3">
          <label className="block">
            <span className="block text-sm mb-1">رقم الطلب</span>
            <input value={orderCode} onChange={(e)=>setOrderCode(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="مثال: 123456" dir="ltr" required />
          </label>
          <label className="block">
            <span className="block text-sm mb-1">البريد الإلكتروني أو الهاتف</span>
            <input value={contact} onChange={(e)=>setContact(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="example@email.com أو 05xxxxxxxx" dir="ltr" required />
          </label>
          {error && <div className="text-red-600 text-sm">{String(error)}</div>}
          <button type="submit" className="w-full bg-black text-white rounded py-2">تحقق</button>
        </form>
      ) : (
        <form onSubmit={submitOtp} className="space-y-3">
          <div className="text-sm text-gray-600">تم إرسال رمز تحقق لمرة واحدة. أدخل الرمز للمتابعة.</div>
          {debugOtp && <div className="text-xs text-gray-500">رمز تجريبي: {debugOtp}</div>}
          <label className="block">
            <span className="block text-sm mb-1">رمز التحقق</span>
            <input value={otp} onChange={(e)=>setOtp(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="123456" dir="ltr" required />
          </label>
          {error && <div className="text-red-600 text-sm">{String(error)}</div>}
          <button type="submit" className="w-full bg-black text-white rounded py-2">عرض التتبع</button>
        </form>
      )}
      <p className="mt-6 text-xs text-gray-500">لن يتم فهرسة هذه الصفحة من محركات البحث.</p>
    </div>
  );
}

