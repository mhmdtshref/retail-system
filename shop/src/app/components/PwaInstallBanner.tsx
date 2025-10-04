"use client";
import { useEffect, useState } from 'react';
import { useInstallPrompt, isIosSafari } from '@/lib/pwa/install';

export function PwaInstallBanner() {
  const install = useInstallPrompt();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onShow = () => setShow(true);
    window.addEventListener('pwa:show-install', onShow);
    return () => window.removeEventListener('pwa:show-install', onShow);
  }, []);
  if (!show) return null;
  return (
    <div className="fixed bottom-4 inset-x-4 bg-white border rounded p-4 shadow-lg" dir="rtl">
      <div className="text-sm mb-2">أضِف التطبيق للشاشة الرئيسية لتجربة أسرع دون اتصال.</div>
      <div className="flex gap-2 justify-end">
        <button className="px-3 py-1 border rounded" onClick={() => setShow(false)}>إغلاق</button>
        <button className="px-3 py-1 bg-black text-white rounded" onClick={async () => { await install.prompt(); setShow(false); }}>إضافة</button>
      </div>
    </div>
  );
}

export function IosAddToHomeSheet() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onShow = () => setShow(true);
    if (isIosSafari()) setShow(true);
    window.addEventListener('pwa:show-ios-guide', onShow);
    return () => window.removeEventListener('pwa:show-ios-guide', onShow);
  }, []);
  if (!show) return null;
  return (
    <div className="fixed bottom-4 inset-x-4 bg-white border rounded p-4 shadow-lg" dir="rtl">
      <div className="text-sm mb-2">على iOS: اضغط على مشاركة ثم «أضِف إلى الشاشة الرئيسية».</div>
      <div className="flex justify-end">
        <button className="px-3 py-1 border rounded" onClick={() => setShow(false)}>حسناً</button>
      </div>
    </div>
  );
}


