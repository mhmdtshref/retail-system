"use client";
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useLocale } from 'next-intl';

function Tab({ id, label, defaultChecked }: { id: string; label: string; defaultChecked?: boolean }) {
  return (
    <>
      <input type="radio" name="tabs" id={id} defaultChecked={defaultChecked} />
      <label htmlFor={id} className="tab">{label}</label>
    </>
  );
}

export default function AdminToolsPage() {
  const t = (s: string) => {
    try { return (window as any).__messages?.adminTools?.[s] || s; } catch { return s; }
  };
  const [role, setRole] = useState<string>('viewer');
  const [enabled, setEnabled] = useState<boolean>(false);
  const locale = useLocale();

  useEffect(() => { (async () => {
    try {
      const res = await fetch('/api/auth/self');
      if (res.ok) { const data = await res.json(); setRole(data?.user?.role || 'viewer'); }
    } catch {}
    setEnabled(process.env.NEXT_PUBLIC_ADMIN_TOOLS_ENABLED === 'true' || !!(globalThis as any).ADMIN_TOOLS_ENABLED);
  })(); }, []);

  if (!enabled) {
    return <main className="p-6" dir="rtl"><div className="rounded border p-4 text-gray-700">هذه الأداة غير متاحة</div></main>;
  }
  if (!(role === 'owner' || role === 'manager')) {
    return <main className="p-6" dir="rtl"><div className="rounded border p-4 text-rose-700">مرفوض: يتطلب صلاحيات مدير</div></main>;
  }

  return (
    <main className="p-6" dir="rtl">
      <h1 className="text-2xl font-bold mb-4">أدوات المدير</h1>
      <div className="tabs">
        <Tab id="tab-fixes" label="إصلاح البيانات" defaultChecked />
        <Tab id="tab-replays" label="إعادة التشغيل" />
        <Tab id="tab-idemp" label="المعرِّف الأحادي" />
      </div>
      <div className="mt-6 grid gap-6">
        <section className="rounded border p-4">
          <h2 className="text-xl mb-2">إصلاح البيانات</h2>
          <p className="text-sm text-gray-600">تشغيل جاف: يعرض الفروقات فقط.</p>
          <div className="mt-3">
            {/* Minimal wizard scaffold; detailed diff views later */}
            {typeof window !== 'undefined' && <DynamicFixWizard />}
          </div>
        </section>
        <section className="rounded border p-4">
          <h2 className="text-xl mb-2">إعادة التشغيل</h2>
          <p className="text-sm text-gray-600">عرض وإعادة محاولة الوظائف الفاشلة.</p>
        </section>
        <section className="rounded border p-4">
          <h2 className="text-xl mb-2">المعرِّف الأحادي</h2>
          <p className="text-sm text-gray-600">بحث وإعادة التشغيل بمفتاح جديد.</p>
        </section>
      </div>
    </main>
  );
}

const DynamicFixWizard = dynamic(() => import('@/components/admin/tools/FixWizard'), { ssr: false });
