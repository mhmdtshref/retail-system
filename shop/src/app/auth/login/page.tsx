"use client";
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const res = await signIn('credentials', { email, password, redirect: false, callbackUrl: '/' });
    setLoading(false);
    if (res?.error) { setError('بيانات الدخول غير صحيحة'); return; }
    if (res?.ok) window.location.href = '/';
  }

  return (
    <main className="min-h-screen grid place-items-center" dir="rtl">
      <form onSubmit={onSubmit} className="w-80 space-y-3 border rounded p-4 bg-white">
        <h1 className="text-xl font-semibold text-center">تسجيل الدخول</h1>
        <label className="block text-sm">
          البريد الإلكتروني
          <input className="mt-1 w-full border rounded px-3 py-2" type="email" dir="ltr" value={email} onChange={(e)=> setEmail(e.target.value)} required />
        </label>
        <label className="block text-sm">
          كلمة المرور
          <input className="mt-1 w-full border rounded px-3 py-2" type="password" value={password} onChange={(e)=> setPassword(e.target.value)} required />
        </label>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button disabled={loading} className="w-full py-2 bg-black text-white rounded">{loading ? '...' : 'دخول'}</button>
        <div className="text-center text-sm">
          <Link href="/auth/forgot" className="underline">نسيت كلمة المرور؟</Link>
        </div>
      </form>
    </main>
  );
}
