"use client";
import { useRouter } from 'next/navigation';
import { UserButton, SignedIn, SignedOut } from '@clerk/nextjs';
import { useTranslations, useLocale } from 'next-intl';
import { Box, Stack, Typography, Button } from '@mui/material';

export default function Home() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  return (
    <Box component="main" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6" fontWeight={600}>{t('app.title')}</Typography>
      <Stack direction="row" spacing={1}>
        <Button onClick={() => router.push(`/${locale}/pos`)} variant="text">{t('nav.pos')}</Button>
        <Button onClick={() => router.push(`/${locale}/returns`)} variant="text">{t('nav.returns') || 'الإرجاع والاستبدال'}</Button>
        <Button onClick={() => router.push(`/${locale}/purchase-orders`)} variant="text">{t('nav.purchaseOrders') || 'أوامر الشراء'}</Button>
        <Button onClick={() => router.push(`/${locale}/products`)} variant="text">{t('nav.products')}</Button>
        <Button onClick={() => router.push(`/${locale}/customers`)} variant="text">{t('nav.customers')}</Button>
        <Button onClick={() => router.push(`/${locale}/sales`)} variant="text">{t('nav.sales')}</Button>
        <Button onClick={() => router.push(`/${locale}/inventory`)} variant="text">{t('nav.inventory') || 'التسويات والجرد'}</Button>
        <Button onClick={() => router.push(`/${locale}/sales/layaway`)} variant="text">{t('layaway.title') || 'تقسيط/الحجوزات'}</Button>
        <Button onClick={() => router.push(`/${locale}/settings`)} variant="text">{t('nav.settings')}</Button>
      </Stack>
      <Box sx={{ ml: 'auto' }}>
        <SignedIn>
          <UserButton afterSignOutUrl="/sign-in" />
        </SignedIn>
        <SignedOut>
          <Button onClick={() => router.push('/sign-in')} variant="outlined">تسجيل الدخول</Button>
        </SignedOut>
      </Box>
    </Box>
  );
}

