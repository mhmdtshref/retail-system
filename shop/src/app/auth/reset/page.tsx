"use client";
import { useState } from 'react';

export default function ResetPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [ok, setOk] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) return;
    setOk(true);
  }

  return (
    <main className="min-h-screen grid place-items-center" dir="rtl">
      <form onSubmit={onSubmit} className="w-96 space-y-3 border rounded p-4 bg-white">
        <h1 className="text-xl font-semibold text-center">إعادة تعيين كلمة المرور</h1>
        <label className="block text-sm">
          كلمة المرور الجديدة
          <input className="mt-1 w-full border rounded px-3 py-2" type="password" value={password} onChange={(e)=> setPassword(e.target.value)} required />
        </label>
        <label className="block text-sm">
          تأكيد كلمة المرور
          <input className="mt-1 w-full border rounded px-3 py-2" type="password" value={confirm} onChange={(e)=> setConfirm(e.target.value)} required />
        </label>
        <button className="w-full py-2 bg-black text-white rounded">تعيين</button>
        {ok && <div className="text-green-700 text-sm text-center">تم التعيين</div>}
      </form>
    </main>
  );
}
