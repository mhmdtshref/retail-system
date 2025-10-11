import { Suspense } from 'react';

async function fetchSummary() {
  const res = await fetch('/api/obs/summary', { cache: 'no-store' });
  if (!res.ok) throw new Error('failed');
  return res.json();
}

function Cards({ data }: { data: any }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3" dir="rtl">
      <div className="rounded border p-3 bg-white"><div className="text-neutral-500 text-sm">أخطاء (24 ساعة)</div><div className="text-2xl font-bold">{data?.errors?.last24h || 0}</div></div>
      <div className="rounded border p-3 bg-white"><div className="text-neutral-500 text-sm">الطلبات/الدقيقة</div><div className="text-2xl font-bold">—</div></div>
      <div className="rounded border p-3 bg-white"><div className="text-neutral-500 text-sm">زمن الاستجابة P95</div><div className="text-2xl font-bold">—</div></div>
    </div>
  );
}

function ErrorsTable({ items }: { items: any[] }) {
  return (
    <div className="overflow-x-auto" dir="rtl">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-right">
            <th className="p-2">المعرف</th>
            <th className="p-2">الوقت</th>
            <th className="p-2">المسار</th>
            <th className="p-2">الطريقة</th>
            <th className="p-2">الملخص</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it:any)=> (
            <tr key={it.id} className="border-t">
              <td className="p-2">{it.id}</td>
              <td className="p-2">{new Date(it.time).toLocaleString('ar-SA')}</td>
              <td className="p-2">{it.route}</td>
              <td className="p-2">{it.method}</td>
              <td className="p-2">{it.summary}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SlowQueriesTable({ items }: { items: any[] }) {
  return (
    <div className="overflow-x-auto" dir="rtl">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-right">
            <th className="p-2">المجموعة</th>
            <th className="p-2">العملية</th>
            <th className="p-2">المدة (مللي ثانية)</th>
            <th className="p-2">الوقت</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it:any, idx:number)=> (
            <tr key={idx} className="border-t">
              <td className="p-2">{it.collection}</td>
              <td className="p-2">{it.op}</td>
              <td className="p-2">{it.ms}</td>
              <td className="p-2">{new Date(it.ts).toLocaleString('ar-SA')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function ObservabilityPage() {
  const data = await fetchSummary();
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold" dir="rtl">المراقبة</h1>
      <Suspense fallback={<div>...</div>}><Cards data={data} /></Suspense>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <h2 className="font-semibold mb-2" dir="rtl">أحدث الأخطاء</h2>
          <ErrorsTable items={data?.errors?.latest || []} />
        </div>
        <div>
          <h2 className="font-semibold mb-2" dir="rtl">استعلامات بطيئة</h2>
          <SlowQueriesTable items={data?.slowQueries || []} />
        </div>
      </div>
    </div>
  );
}
