"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PaymentsForm } from '@/components/settings/PaymentsForm';

export default function SettingsPaymentsPage() {
  const [role, setRole] = useState<string>('viewer');
  useEffect(() => { (async () => { try { const res = await fetch('/api/auth/self'); if (res.ok) { const data = await res.json(); setRole(data?.user?.role || 'viewer'); } } catch {} })(); }, []);
  if (!(role === 'owner' || role === 'manager')) return <main className="p-4"><div className="rounded border p-4 text-rose-700">مرفوض: يتطلب صلاحيات مدير</div></main>;
  return (
    <main className="flex flex-col gap-4">
      <div className="flex items-center gap-2 border rounded p-2 bg-white dark:bg-neutral-900 sticky top-0 z-10">
        <Link className="px-3 py-1 rounded border" href="/settings/payments">المدفوعات</Link>
        <Link className="px-3 py-1 rounded border" href="/settings/locales">اللغة والتنسيق</Link>
        <Link className="px-3 py-1 rounded border" href="/settings/receipts">الإيصالات</Link>
      </div>
      <PaymentsForm />
    </main>
  );
}

