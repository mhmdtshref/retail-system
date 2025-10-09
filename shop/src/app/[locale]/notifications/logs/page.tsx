"use client";
import { useEffect, useMemo, useState } from 'react';
import { VirtualTable } from '@/components/virtualized/VirtualTable';

export default function NotificationsLogsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams();
        params.set('limit', '100');
        if (cursor) params.set('cursor', cursor);
        const res = await fetch('/api/notifications/logs?' + params.toString());
        if (res.ok) {
          const data = await res.json();
          setItems((prev) => cursor ? [...prev, ...(data.items || [])] : (data.items || []));
          setHasMore(!!data.nextCursor);
          setCursor(data.nextCursor);
        }
      } finally { setLoading(false); }
    })();
  }, []);

  const columns = useMemo(() => ([
    { key: 'createdAt', header: 'التاريخ', width: 220, cell: (it: any) => new Date(it.createdAt).toLocaleString('ar-SA') },
    { key: 'event', header: 'الحدث' },
    { key: 'channel', header: 'القناة', width: 140 },
    { key: 'customerId', header: 'العميل' },
    { key: 'status', header: 'الحالة', width: 140 },
    { key: 'attempt', header: 'المحاولة', width: 100 },
  ]), []);

  if (loading) return <main className="p-4">…</main>;

  return (
    <main className="p-4" dir="rtl">
      <h1 className="text-xl font-semibold mb-4">سجل الإشعارات</h1>
      <VirtualTable rows={items} columns={columns as any} rowKey={(r:any)=> r._id} />
      {hasMore && (
        <div className="flex justify-center py-2">
          <button className="px-3 py-1 rounded border" onClick={() => {
            const c = cursor; if (!c) return;
            (async () => {
              const params = new URLSearchParams();
              params.set('limit', '100');
              params.set('cursor', c);
              const res = await fetch('/api/notifications/logs?' + params.toString());
              if (res.ok) {
                const data = await res.json();
                setItems((prev) => [...prev, ...(data.items || [])]);
                setHasMore(!!data.nextCursor);
                setCursor(data.nextCursor);
              }
            })();
          }}>تحميل المزيد</button>
        </div>
      )}
    </main>
  );
}
