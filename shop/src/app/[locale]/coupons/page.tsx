"use client";
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function CouponsPage() {
  const t = useTranslations();
  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/coupons');
        if (res.ok) {
          const data = await res.json();
          setCodes(data.coupons || []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="p-4">…</div>;

  return (
    <main className="p-4" dir="rtl">
      <div className="flex items-center mb-3">
        <h1 className="text-xl font-semibold">القسائم</h1>
        <Link href="/coupons/new-batch" className="ms-auto px-3 py-1 rounded bg-emerald-600 text-white">توليد مجموعة</Link>
      </div>
      <div className="border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-start p-2">الكود</th>
              <th className="text-start p-2">القيمة</th>
              <th className="text-start p-2">النوع</th>
              <th className="text-start p-2">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => (
              <tr key={c._id} className="border-t">
                <td className="p-2"><bdi dir="ltr">{c.code}</bdi></td>
                <td className="p-2">{c.value}</td>
                <td className="p-2">{c.type}</td>
                <td className="p-2">{c.active ? 'نشط' : 'متوقف'}</td>
              </tr>
            ))}
            {codes.length === 0 && (
              <tr><td colSpan={4} className="p-3 text-center text-muted-foreground">—</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
