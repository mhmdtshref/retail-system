"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function SettingsIndexPage() {
  const [role, setRole] = useState<string>('viewer');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/self');
        if (res.ok) {
          const data = await res.json();
          setRole(data?.user?.role || 'viewer');
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  if (loading) return <main className="p-4">...تحميل</main>;
  if (!(role === 'owner' || role === 'manager')) {
    return <main className="p-4"><div className="rounded border p-4 text-rose-700">مرفوض: يتطلب صلاحيات مدير</div></main>;
  }

  return (
    <main className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">الإعدادات</h1>
      <div className="flex items-center gap-2 border rounded p-2 bg-white dark:bg-neutral-900 sticky top-0 z-10">
        <Link className="px-3 py-1 rounded border" href="/settings/payments">المدفوعات</Link>
        <Link className="px-3 py-1 rounded border" href="/settings/locales">اللغة والتنسيق</Link>
        <Link className="px-3 py-1 rounded border" href="/settings/receipts">الإيصالات</Link>
        <Link className="px-3 py-1 rounded border" href="/settings/accounting">المحاسبة</Link>
        <Link className="px-3 py-1 rounded border" href="/settings/notifications">الإشعارات</Link>
        <Link className="px-3 py-1 rounded border" href="/settings/observability">المراقبة</Link>
      </div>
      <div className="text-sm text-neutral-600">اختر تبويبًا أعلاه لعرض الإعدادات.</div>
    </main>
  );
}

