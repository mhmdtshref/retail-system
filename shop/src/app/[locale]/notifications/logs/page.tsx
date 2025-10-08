"use client";
import { useEffect, useState } from 'react';

export default function NotificationsLogsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/notifications/logs');
        if (res.ok) {
          const data = await res.json();
          setItems(data.items || []);
        }
      } finally { setLoading(false); }
    })();
  }, []);
  if (loading) return <main className="p-4">…</main>;
  return (
    <main className="p-4" dir="rtl">
      <h1 className="text-xl font-semibold mb-4">سجل الإشعارات</h1>
      <div className="overflow-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-right p-2">التاريخ</th>
              <th className="text-right p-2">الحدث</th>
              <th className="text-right p-2">القناة</th>
              <th className="text-right p-2">العميل</th>
              <th className="text-right p-2">الحالة</th>
              <th className="text-right p-2">المحاولة</th>
              <th className="text-right p-2">المعرف</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it._id} className="border-t">
                <td className="p-2 whitespace-nowrap">{new Date(it.createdAt).toLocaleString('ar-SA')}</td>
                <td className="p-2">{it.event}</td>
                <td className="p-2">{it.channel}</td>
                <td className="p-2">{it.customerId}</td>
                <td className="p-2">{it.status}</td>
                <td className="p-2">{it.attempt}</td>
                <td className="p-2">{it.provider?.responseId || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

"use client";
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function NotificationsLogsPage() {
  const { data, error, isLoading } = useSWR('/api/notifications/logs?limit=100', fetcher);

  if (isLoading) return <div className="p-6">…</div>;
  if (error) return <div className="p-6 text-red-600">فشل التحميل</div>;

  const items = (data?.items || []) as any[];

  return (
    <div className="p-6" dir="rtl">
      <h2 className="text-xl font-bold mb-4">سجل الإشعارات</h2>
      <table className="w-full text-sm border">
        <thead>
          <tr className="bg-gray-50">
            <th className="p-2 border">التاريخ</th>
            <th className="p-2 border">الحدث</th>
            <th className="p-2 border">القناة</th>
            <th className="p-2 border">العميل</th>
            <th className="p-2 border">الحالة</th>
            <th className="p-2 border">المحاولة</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it._id}>
              <td className="p-2 border">{new Date(it.createdAt).toLocaleString()}</td>
              <td className="p-2 border">{it.event}</td>
              <td className="p-2 border">{it.channel}</td>
              <td className="p-2 border">{it.customerId}</td>
              <td className="p-2 border">{it.status}</td>
              <td className="p-2 border">{it.attempt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
