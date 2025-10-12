"use client";
import { useEffect, useState } from 'react';

export default function ReplayTable() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [kind, setKind] = useState<'webhook'|'delivery'|'notification'|'outbox'>('webhook');
  const [ids, setIds] = useState<string>('');

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/tools/replays/jobs');
      const data = await res.json();
      setJobs(data.items || []);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function run() {
    const list = ids.split(/[,\s]+/).map((s)=> s.trim()).filter(Boolean).slice(0, 100);
    if (!list.length) return;
    const res = await fetch('/api/admin/tools/replays/run', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `${kind}:${Date.now()}` }, body: JSON.stringify({ kind, ids: list, options: { backoffMs: 1000, maxAttempts: 5 } }) });
    if (res.ok) {
      setIds('');
      await load();
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-end">
        <select value={kind} onChange={(e)=> setKind(e.target.value as any)} className="border rounded px-2 py-1">
          <option value="webhook">Webhooks</option>
          <option value="delivery">التوصيل</option>
          <option value="notification">الإشعارات</option>
          <option value="outbox">Outbox</option>
        </select>
        <input dir="ltr" className="border rounded px-2 py-1 min-w-64 flex-1" placeholder="IDs مفصولة بفواصل" value={ids} onChange={(e)=> setIds(e.target.value)} />
        <button onClick={run} className="px-3 py-1 rounded bg-blue-600 text-white">تشغيل</button>
      </div>
      <div className="overflow-auto border rounded">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-right">
              <th className="p-2">النوع</th>
              <th className="p-2">المعرف</th>
              <th className="p-2">الحالة</th>
              <th className="p-2">النتائج</th>
              <th className="p-2">الوقت</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j)=> (
              <tr key={j._id || j.jobId} className="border-t">
                <td className="p-2">{j.kind}</td>
                <td className="p-2" dir="ltr">{j.jobId}</td>
                <td className="p-2">{j.status}</td>
                <td className="p-2" dir="ltr">{j.stats ? JSON.stringify(j.stats) : '-'}</td>
                <td className="p-2">{new Date(j.createdAt).toLocaleString('ar-SA')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
