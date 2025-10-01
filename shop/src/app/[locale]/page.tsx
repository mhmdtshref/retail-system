import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';

export default function Home() {
  const t = useTranslations();
  const locale = useLocale();
  return (
    <main className="p-6 flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{t('app.title')}</h1>
      <nav className="flex gap-4">
        <Link className="underline" href={`/${locale}/pos`}>{t('nav.pos')}</Link>
        <Link className="underline" href={`/${locale}/purchase-orders`}>{t('nav.purchaseOrders') || 'أوامر الشراء'}</Link>
        <Link className="underline" href={`/${locale}/products`}>{t('nav.products')}</Link>
        <Link className="underline" href={`/${locale}/customers`}>{t('nav.customers')}</Link>
        <Link className="underline" href={`/${locale}/sales`}>{t('nav.sales')}</Link>
        <Link className="underline" href={`/${locale}/sales/layaway`}>{t('layaway.title') || 'تقسيط/الحجوزات'}</Link>
        <Link className="underline" href={`/${locale}/settings`}>{t('nav.settings')}</Link>
      </nav>
    </main>
  );
}

