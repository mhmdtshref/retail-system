"use client";
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function PromotionsPage() {
  const t = useTranslations();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/promotions');
        if (res.ok) {
          const data = await res.json();
          setItems(data.promotions || []);
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
        <h1 className="text-xl font-semibold">العروض</h1>
        <Link href="/promotions/new" className="ms-auto px-3 py-1 rounded bg-emerald-600 text-white">جديد</Link>
      </div>
      <div className="border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-start p-2">الاسم</th>
              <th className="text-start p-2">النوع</th>
              <th className="text-start p-2">المستوى</th>
              <th className="text-start p-2">الأولوية</th>
              <th className="text-start p-2">الحالة</th>
              <th className="text-start p-2">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p._id} className="border-t">
                <td className="p-2">{p.name}</td>
                <td className="p-2">{p.type}</td>
                <td className="p-2">{p.level}</td>
                <td className="p-2">{p.priority}</td>
                <td className="p-2">{p.active ? 'نشط' : 'متوقف'}</td>
                <td className="p-2 flex gap-2">
                  <Link href={`/promotions/${p._id}`} className="px-2 py-1 rounded border">عرض</Link>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={6} className="p-3 text-center text-muted-foreground">—</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
