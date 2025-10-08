"use client";
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

export default function TransferDetailPage({ params }: { params: { id: string } }) {
  const t = useTranslations();
  const [doc, setDoc] = useState<any | null>(null);
  const [picks, setPicks] = useState<Record<string, number>>({});
  const [receipts, setReceipts] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/transfers?status=&from=&to=');
      if (res.ok) {
        const data = await res.json();
        const found = (data.transfers || []).find((x: any) => x._id === params.id);
        setDoc(found || null);
      }
    })();
  }, [params.id]);

  if (!doc) return <main className="p-4">…</main>;

  async function post(action: 'approve'|'pick'|'dispatch'|'receive') {
    const url = `/api/transfers/${doc._id}/${action}`;
    const payload = action === 'pick' ? { picks: Object.entries(picks).map(([k,v])=> ({ sku: k, qty: v })) }
                   : action === 'receive' ? { receipts: Object.entries(receipts).map(([k,v])=> ({ sku: k, qty: v })) }
                   : {};
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `${doc._id}:${action}:${Date.now()}` }, body: JSON.stringify(payload) });
    if (res.ok) {
      const data = await res.json();
      setDoc(data.transfer);
      setPicks({}); setReceipts({});
    }
  }

  return (
    <main className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{doc.code}</h1>
        <div className="flex items-center gap-2">
          <button className="px-2 py-1 rounded border" onClick={()=> post('approve')}>اعتماد</button>
          <button className="px-2 py-1 rounded border" onClick={()=> post('dispatch')}>شحن</button>
          <button className="px-2 py-1 rounded border" onClick={()=> post('receive')}>استلام</button>
        </div>
      </div>
      <div className="rounded border">
        {(doc.lines||[]).map((l: any) => (
          <div key={l.sku + (l.variantId||'')} className="grid grid-cols-6 gap-2 p-2 border-b">
            <div className="font-mono col-span-2">{l.sku}</div>
            <div>الكمية: {l.qty}</div>
            <div>المُلتقط: {l.picked||0}</div>
            <div>المُستلم: {l.received||0}</div>
            <div className="flex gap-1">
              <input className="w-16 border rounded px-1" placeholder="Pick" value={picks[l.sku]||''} onChange={(e)=> setPicks({ ...picks, [l.sku]: Number(e.target.value||0) })} />
              <input className="w-16 border rounded px-1" placeholder="Recv" value={receipts[l.sku]||''} onChange={(e)=> setReceipts({ ...receipts, [l.sku]: Number(e.target.value||0) })} />
              <button className="px-2 py-1 rounded border" onClick={()=> post('pick')}>تأكيد الالتقاط</button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
