import Link from 'next/link';
import { headers } from 'next/headers';

async function fetchPOs(params: { status?: string; supplier?: string; search?: string }, baseUrl: string) {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.supplier) qs.set('supplier', params.supplier);
  if (params.search) qs.set('search', params.search);
  const suffix = qs.toString();
  const url = `${baseUrl}/api/purchase-orders${suffix ? `?${suffix}` : ''}`;
  const res = await fetch(url, { cache: 'no-store' });
  const data = await res.json();
  return data.purchaseOrders as any[];
}

export default async function PurchaseOrdersPage({ searchParams }: { searchParams: Promise<{ [k: string]: string | string[] | undefined }> }) {
  const sp = await searchParams;
  const status = typeof sp.status === 'string' ? sp.status : undefined;
  const search = typeof sp.q === 'string' ? sp.q : undefined;
  const h = headers();
  const host = h.get('host') || 'localhost:3000';
  const proto = host.includes('localhost') || host.startsWith('127.') ? 'http' : 'https';
  const baseUrl = `${proto}://${host}`;
  const pos = await fetchPOs({ status, search }, baseUrl);
  return (
    <div className="p-4" dir="rtl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">أوامر الشراء</h1>
        <Link href="new" className="px-3 py-2 rounded bg-emerald-600 text-white">جديد</Link>
      </div>
      <div className="overflow-auto border rounded">
        <table className="min-w-full text-right">
          <thead className="sticky top-0 bg-gray-50">
            <tr>
              <th className="p-2">رقم الأمر</th>
              <th className="p-2">المورد</th>
              <th className="p-2">الحالة</th>
              <th className="p-2">الإجمالي</th>
              <th className="p-2">تم الاستلام</th>
            </tr>
          </thead>
          <tbody>
            {pos.map((p) => (
              <tr key={p._id} className="border-t hover:bg-gray-50">
                <td className="p-2"><Link href={`/purchase-orders/${p._id}`} className="text-blue-600">{p.poNumber}</Link></td>
                <td className="p-2">{p.supplierId}</td>
                <td className="p-2">{p.status === 'draft' ? 'مسودة' : p.status === 'partial' ? 'تم الاستلام جزئيًا' : p.status === 'received' ? 'تم الاستلام' : 'ملغي'}</td>
                <td className="p-2">{p.totals?.grandTotal?.toFixed?.(2) || '-'}</td>
                <td className="p-2">{p.receivedAt ? new Date(p.receivedAt).toLocaleString() : '-'}</td>
              </tr>
            ))}
            {pos.length === 0 && (
              <tr><td className="p-3 text-sm text-gray-500" colSpan={5}>لا يوجد نتائج</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

