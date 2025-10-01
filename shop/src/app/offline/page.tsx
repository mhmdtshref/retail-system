import { useTranslations } from 'next-intl';

export default function OfflinePage() {
  const t = useTranslations();
  return (
    <main className="p-6 max-w-prose">
      <h1 className="text-2xl font-semibold">{t('offline.fallback.title')}</h1>
      <p className="mt-4 text-muted-foreground">{t('offline.fallback.body')}</p>
      <button className="mt-6 px-4 py-2 rounded border" onClick={() => location.reload()}>
        {t('common.confirm') || 'جرّب إعادة المحاولة'}
      </button>
    </main>
  );
}

