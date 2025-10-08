"use client";
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

export default function DeliverySettingsPage() {
  const t = useTranslations();
  const [carriers, setCarriers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/delivery/carriers');
      const data = await res.json();
      setCarriers(data.carriers || []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  return (
    <main className="p-4 flex flex-col gap-3">
      <h2 className="text-lg font-semibold">إعدادات التوصيل</h2>
      <div className="overflow-auto">
        <table className="w-full text-sm border">
          <thead>
            <tr className="bg-neutral-50 dark:bg-neutral-900">
              <th className="p-2 text-start">الاسم</th>
              <th className="p-2 text-start">النوع</th>
              <th className="p-2 text-start">مفعل</th>
              <th className="p-2 text-start">المدينة</th>
              <th className="p-2 text-start">الدولة</th>
            </tr>
          </thead>
          <tbody>
            {carriers.map((c) => (
              <tr key={c._id} className="border-t">
                <td className="p-2">{c.name}</td>
                <td className="p-2">{c.type}</td>
                <td className="p-2">{c.enabled ? 'نعم' : 'لا'}</td>
                <td className="p-2">{c.pickup?.city}</td>
                <td className="p-2">{c.pickup?.country}</td>
              </tr>
            ))}
            {carriers.length === 0 && (
              <tr><td className="p-3 text-center text-muted-foreground" colSpan={5}>{loading ? '...' : '—'}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

