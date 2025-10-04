"use client";

export default function OfflinePage() {
  return (
    <main className="p-6 max-w-prose" dir="rtl">
      <h1 className="text-2xl font-semibold">لا يوجد اتصال</h1>
      <p className="mt-4 text-muted-foreground">بعض الصفحات تتطلب اتصالاً بالإنترنت. يمكنك استخدام صفحة نقطة البيع دون اتصال.</p>
      <button className="mt-6 px-4 py-2 rounded border" onClick={() => location.reload()}>
        جرّب إعادة المحاولة
      </button>
    </main>
  );
}

