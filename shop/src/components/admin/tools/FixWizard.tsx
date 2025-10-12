"use client";
import { useEffect, useState } from 'react';

export default function FixWizard() {
  const [kind, setKind] = useState<'order_totals'|'stock_reserved'|'layaway_balance'|'orphan_payments'|'transfer_state'|'customer_merge'>('order_totals');
  const [dry, setDry] = useState(true);
  const [report, setReport] = useState<any | null>(null);
  const [running, setRunning] = useState(false);

  async function run() {
    setRunning(true);
    try {
      const res = await fetch('/api/admin/tools/fixes/run', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `${kind}:${Date.now()}` }, body: JSON.stringify({ kind, params: {}, dryRun: dry }) });
      const data = await res.json();
      setReport(data);
    } finally { setRunning(false); }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-center">
        <select value={kind} onChange={(e)=> setKind(e.target.value as any)} className="border rounded px-2 py-1">
          <option value="order_totals">إعادة حساب إجمالي الطلب</option>
          <option value="stock_reserved">إعادة احتساب المحجوز</option>
          <option value="layaway_balance">إعادة احتساب رصيد التقسيط</option>
          <option value="orphan_payments">مدفوعات يتيمة</option>
          <option value="transfer_state">إصلاح حالات التحويل</option>
          <option value="customer_merge">دمج العملاء (مُرشد)</option>
        </select>
        <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={dry} onChange={(e)=> setDry(e.target.checked)} /> تشغيل جاف</label>
        <button disabled={running} onClick={run} className="px-3 py-1 rounded bg-blue-600 text-white">تشغيل</button>
      </div>
      {report && (
        <pre className="p-2 bg-gray-50 rounded overflow-auto text-xs" dir="ltr">{JSON.stringify(report, null, 2)}</pre>
      )}
    </div>
  );
}
