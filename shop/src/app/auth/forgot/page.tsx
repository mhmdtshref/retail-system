"use client";
import { useState } from 'react';

export default function ForgotPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <main className="min-h-screen grid place-items-center" dir="rtl">
      <form onSubmit={onSubmit} className="w-96 space-y-3 border rounded p-4 bg-white">
        <h1 className="text-xl font-semibold text-center">نسيت كلمة المرور</h1>
        <label className="block text-sm">
          البريد الإلكتروني
          <input className="mt-1 w-full border rounded px-3 py-2" type="email" dir="ltr" value={email} onChange={(e)=> setEmail(e.target.value)} required />
        </label>
        {!sent && <button className="w-full py-2 bg-black text-white rounded">إرسال رابط إعادة التعيين</button>}
        {sent && <div className="text-green-700 text-sm text-center">تم الإرسال إن وجد الحساب.</div>}
      </form>
    </main>
  );
}
