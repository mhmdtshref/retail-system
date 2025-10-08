import { notFound } from 'next/navigation';

async function getData(id: string) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/customers/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.customer;
  } catch { return null; }
}

export default async function CustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getData(id);
  if (!data) notFound();
  return (
    <main className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xl font-semibold">{data.fullName_ar || data.fullName_en}</div>
          <div className="text-sm text-muted-foreground">{(data.phones || []).map((p: any) => p.e164).join(' • ')}</div>
        </div>
        <div className="rounded px-2 py-1 text-xs border">{data.status === 'active' ? 'نشط' : 'مؤرشف'}</div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="rounded border p-2">
          <div className="text-muted-foreground">إجمالي المشتريات</div>
          <div className="font-medium">{(data.stats?.lifetimeSpend || 0).toFixed(2)}</div>
        </div>
        <div className="rounded border p-2">
          <div className="text-muted-foreground">عدد الطلبات</div>
          <div className="font-medium">{data.stats?.ordersCount || 0}</div>
        </div>
        <div className="rounded border p-2">
          <div className="text-muted-foreground">آخر طلب</div>
          <div className="font-medium">{data.stats?.lastOrderAt ? new Date(data.stats.lastOrderAt).toLocaleDateString() : '—'}</div>
        </div>
        <div className="rounded border p-2">
          <div className="text-muted-foreground">رصيد المتجر</div>
          <div className="font-medium">{(data.stats?.storeCredit || 0).toFixed(2)}</div>
        </div>
      </div>
      <div className="rounded border p-3">
        <div className="font-medium mb-2">العناوين</div>
        <div className="text-sm text-muted-foreground">إدارة العناوين ستضاف لاحقًا.</div>
      </div>
    </main>
  );
}

