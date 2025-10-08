"use client";
export function LayawayAgreement({ code, terms }: { code: string; terms?: string }) {
  return (
    <div dir="rtl" className="receipt w-[80mm] mx-auto text-sm">
      <div className="text-center font-semibold mb-2">اتفاقية الحجز</div>
      <div className="mb-2">رقم الحجز: {code}</div>
      <div className="text-xs whitespace-pre-wrap">{terms || 'أوافق على شروط الحجز والدفع خلال المدة المحددة. في حال التأخر، قد يتم إلغاء الحجز أو مصادرة الدفعات حسب سياسة المتجر.'}</div>
    </div>
  );
}

