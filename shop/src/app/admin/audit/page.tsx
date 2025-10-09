import { Suspense } from 'react';

async function fetchAudit(params: URLSearchParams) {
  const qs = params.toString();
  const res = await fetch(`/api/admin/audit?${qs}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('failed');
  return res.json();
}

function Table({ items }: { items: any[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm" dir="rtl">
        <thead>
          <tr className="text-right">
            <th className="p-2">الحدث</th>
            <th className="p-2">المستخدم</th>
            <th className="p-2">الكيان</th>
            <th className="p-2">عنوان IP</th>
            <th className="p-2">الوكيل</th>
            <th className="p-2">الحالة</th>
            <th className="p-2">الوقت</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it:any)=> (
            <tr key={it._id} className="border-t">
              <td className="p-2">{it.action}</td>
              <td className="p-2">{it.actor?.id} ({it.actor?.role})</td>
              <td className="p-2">{it.entity?.type} {it.entity?.id}</td>
              <td className="p-2">{it.ip}</td>
              <td className="p-2 truncate max-w-xs">{it.ua}</td>
              <td className="p-2">{it.status}</td>
              <td className="p-2">{new Date(it.createdAt || it.ts).toLocaleString('ar-SA')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string,string>> }) {
  const params = new URLSearchParams(Object.entries(await searchParams || {}));
  const data = await fetchAudit(params);
  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-2 items-center">
        <a href={`/api/admin/audit?${params.toString()}&format=csv`} className="px-3 py-2 bg-blue-600 text-white rounded">تصدير CSV</a>
      </div>
      <Suspense fallback={<div>...</div>}>
        <Table items={data.items || []} />
      </Suspense>
    </div>
  );
}
