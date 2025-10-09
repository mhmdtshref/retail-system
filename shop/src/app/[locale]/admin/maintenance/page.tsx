"use client";
import useSWR from 'swr';
import { useLocale } from 'next-intl';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function Page() {
  const locale = useLocale();
  const { data } = useSWR(`/api/admin/backup`, fetcher);
  return (
    <div dir="rtl" className="p-6">
      <h1 className="text-2xl font-bold mb-4">الصيانة</h1>
      <div className="tabs">
        <input type="radio" name="tabs" id="tab1" defaultChecked />
        <label htmlFor="tab1" className="tab">النسخ الاحتياطي</label>
        <input type="radio" name="tabs" id="tab2" />
        <label htmlFor="tab2" className="tab">البيانات التجريبية</label>
        <input type="radio" name="tabs" id="tab3" />
        <label htmlFor="tab3" className="tab">الترحيلات</label>
      </div>
      <div className="mt-6">
        <h2 className="text-xl mb-2">سجل النسخ الاحتياطي</h2>
        <table className="w-full text-right">
          <thead>
            <tr>
              <th className="p-2">التاريخ</th>
              <th className="p-2">المجموعات</th>
              <th className="p-2">الحالة</th>
              <th className="p-2">الحجم</th>
            </tr>
          </thead>
          <tbody>
            {data?.jobs?.map((j: any) => (
              <tr key={j._id} className="border-t">
                <td className="p-2">{new Date(j.createdAt).toLocaleString(locale)}</td>
                <td className="p-2">{(j.collections || []).join(', ')}</td>
                <td className="p-2">{j.status}</td>
                <td className="p-2">{j.bytes || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
