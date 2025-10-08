"use client";
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function ReportsHub() {
  const t = useTranslations('reports');
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">{t('title')}</h1>
      <div className="flex gap-2">
        <Link href="/ar/reports/daily" className="px-3 py-2 border rounded">{t('daily')}</Link>
        <Link href="/ar/reports/aging" className="px-3 py-2 border rounded">{t('aging')}</Link>
        <Link href="/ar/reports/valuation" className="px-3 py-2 border rounded">{t('valuation')}</Link>
        <Link href="/ar/reports/accounting" className="px-3 py-2 border rounded">التقارير المحاسبية</Link>
      </div>
    </div>
  );
}

