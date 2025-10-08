"use client";
import { useEffect, useMemo, useState } from 'react';

export default function AccountingReportsPage() {
  const [role, setRole] = useState<string>('viewer');
  const [offline, setOffline] = useState<boolean>(false);
  const [batches, setBatches] = useState<any[]>([]);
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/self');
        if (res.ok) {
          const data = await res.json();
          setRole(data?.user?.role || 'viewer');
        }
      } catch {}
      setOffline(typeof navigator !== 'undefined' ? !navigator.onLine : false);
    })();
  }, []);

  const canExport = role === 'owner' || role === 'manager';
  const disabled = offline || !canExport || !from || !to || loading;

  async function runExport() {
    setLoading(true);
    try {
      const key = `acc-${from}-${to}`;
      const res = await fetch('/api/accounting/export', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify({ from, to }) });
      if (res.ok) {
        const data = await res.json();
        setBatches((prev) => [data, ...prev.filter((b) => b._id !== data._id)]);
      }
    } catch {}
    setLoading(false);
  }

  return (
    <main className="p-4 flex flex-col gap-3 rtl">
      <h1 className="text-lg font-semibold">التقارير المحاسبية</h1>
      {offline && <div className="text-amber-700 text-sm">العملية تتطلب اتصالاً بالإنترنت</div>}
      <div className="flex items-center gap-2">
        <input type="date" value={from} onChange={(e)=> setFrom(e.target.value)} className="border rounded px-2 py-1" />
        <span>إلى</span>
        <input type="date" value={to} onChange={(e)=> setTo(e.target.value)} className="border rounded px-2 py-1" />
        <button disabled={disabled} onClick={runExport} className="px-3 py-1 rounded border disabled:opacity-50">تشغيل التصدير</button>
      </div>
      <div className="border rounded">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-neutral-100">
              <th className="p-2 text-right">المعرف</th>
              <th className="p-2 text-right">الفترة</th>
              <th className="p-2 text-right">الحالة</th>
              <th className="p-2 text-right">الملفات</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((b) => (
              <tr key={b._id} className="border-t">
                <td className="p-2">{b._id}</td>
                <td className="p-2">{b.rangeLocal?.start} → {b.rangeLocal?.end}</td>
                <td className="p-2">{b.status}</td>
                <td className="p-2">{b.files?.map((f:any)=> f.name).join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

