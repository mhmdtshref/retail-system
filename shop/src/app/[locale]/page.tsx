import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function Home() {
  const t = useTranslations();
  return (
    <main className="p-6 flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{t('app.title')}</h1>
      <nav className="flex gap-4">
        <Link className="underline" href="/pos">{t('nav.pos')}</Link>
        <Link className="underline" href="/products">{t('nav.products')}</Link>
        <Link className="underline" href="/customers">{t('nav.customers')}</Link>
        <Link className="underline" href="/sales">{t('nav.sales')}</Link>
        <Link className="underline" href="/settings">{t('nav.settings')}</Link>
      </nav>
    </main>
  );
}

