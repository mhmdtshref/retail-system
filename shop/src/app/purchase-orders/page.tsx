import Link from 'next/link';

async function fetchPOs(params: { status?: string; supplier?: string; search?: string }) {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.supplier) qs.set('supplier', params.supplier);
  if (params.search) qs.set('search', params.search);
  const res = await fetch(`/api/purchase-orders?${qs.toString()}`, { cache: 'no-store' });
  const data = await res.json();
  return data.purchaseOrders as any[];
}

export default async function PurchaseOrdersPage({ searchParams }: { searchParams: { [k: string]: string | string[] | undefined } }) {
  const status = typeof searchParams.status === 'string' ? searchParams.status : undefined;
  const search = typeof searchParams.q === 'string' ? searchParams.q : undefined;
  const pos = await fetchPOs({ status, search });
  return (
    <div className="p-4" dir="rtl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">أوامر الشراء</h1>
        <Link href="/purchase-orders/new" className="px-3 py-2 rounded bg-emerald-600 text-white">جديد</Link>
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

