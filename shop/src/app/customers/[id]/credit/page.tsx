"use client";
import { useEffect, useMemo, useState } from 'react';

type Credit = { _id: string; code: string; issuedAmount: number; remainingAmount: number; status: string; issuedAt: number; expiresAt?: number };

export default function CustomerCreditPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [balance, setBalance] = useState<number>(0);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);
  const [issueAmount, setIssueAmount] = useState<number>(0);
  const [issueExpiry, setIssueExpiry] = useState<string>('');
  const [issueNote, setIssueNote] = useState<string>('');

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/customers/${id}/credit`);
    if (res.ok) {
      const data = await res.json();
      setBalance(data.balance || 0);
      setCredits(data.credits || []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function issue() {
    const body: any = { customerId: id, amount: issueAmount, origin: { type: 'manual' as const } };
    if (issueExpiry) body.expiresAt = new Date(issueExpiry).toISOString();
    if (issueNote) body.note = issueNote;
    const res = await fetch('/api/store-credit/issue', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `issue:${id}:${Date.now()}` }, body: JSON.stringify(body) });
    if (res.ok) { await load(); setIssueAmount(0); setIssueExpiry(''); setIssueNote(''); }
  }

  return (
    <main className="p-4" dir="rtl">
      <h1 className="text-xl font-semibold mb-3">رصيد العميل</h1>
      {loading ? (
        <div>جار التحميل…</div>
      ) : (
        <>
          <div className="mb-4 p-3 rounded border bg-emerald-50 text-emerald-800 flex items-center justify-between">
            <div>الرصيد المتاح</div>
            <div className="text-lg font-bold">{balance.toLocaleString('ar-SA')}</div>
          </div>

          <div className="mb-4 p-3 rounded border">
            <div className="font-medium mb-2">إصدار رصيد</div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <input type="number" value={issueAmount} onChange={(e)=> setIssueAmount(Number(e.target.value))} className="border rounded px-2 py-1" placeholder="المبلغ" />
              <input type="date" value={issueExpiry} onChange={(e)=> setIssueExpiry(e.target.value)} className="border rounded px-2 py-1" />
              <input value={issueNote} onChange={(e)=> setIssueNote(e.target.value)} className="border rounded px-2 py-1" placeholder="ملاحظة" />
              <button className="px-3 py-1 rounded bg-black text-white disabled:opacity-50" disabled={issueAmount<=0} onClick={issue}>إصدار</button>
            </div>
          </div>

          <div className="overflow-auto border rounded">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-2">الكود</th>
                  <th className="p-2">المصدر</th>
                  <th className="p-2">المبلغ الصادر</th>
                  <th className="p-2">المتبقي</th>
                  <th className="p-2">الحالة</th>
                  <th className="p-2">الانتهاء</th>
                </tr>
              </thead>
              <tbody>
                {credits.map((c) => (
                  <tr key={c._id} className="border-t">
                    <td className="p-2"><bdi dir="ltr">{c.code}</bdi></td>
                    <td className="p-2">—</td>
                    <td className="p-2">{c.issuedAmount.toLocaleString('ar-SA')}</td>
                    <td className="p-2">{c.remainingAmount.toLocaleString('ar-SA')}</td>
                    <td className="p-2">{c.status}</td>
                    <td className="p-2">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('ar-SA') : '—'}</td>
                  </tr>
                ))}
                {credits.length === 0 && (
                  <tr><td colSpan={6} className="p-3 text-center text-gray-500">لا يوجد أرصدة</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}


