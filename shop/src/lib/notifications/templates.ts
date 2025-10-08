export type Channel = 'email'|'sms'|'whatsapp';
export type EventKey = 'ORDER_CREATED'|'ORDER_PAID'|'SHIPMENT_CREATED'|'OUT_FOR_DELIVERY'|'DELIVERED'|'COD_REMINDER'|'LAYAWAY_CREATED'|'LAYAWAY_PAYMENT_POSTED'|'LAYAWAY_DUE_SOON'|'LAYAWAY_OVERDUE'|'LAYAWAY_FORFEITED';

export const EVENT_CHANNEL_DEFAULTS: Record<EventKey, { email: boolean; sms: boolean; whatsapp: boolean }> = {
  ORDER_CREATED: { email: true, sms: false, whatsapp: false },
  ORDER_PAID: { email: true, sms: false, whatsapp: false },
  SHIPMENT_CREATED: { email: true, sms: false, whatsapp: false },
  OUT_FOR_DELIVERY: { email: true, sms: true, whatsapp: false },
  DELIVERED: { email: true, sms: false, whatsapp: false },
  COD_REMINDER: { email: true, sms: true, whatsapp: false },
  LAYAWAY_CREATED: { email: true, sms: true, whatsapp: false },
  LAYAWAY_PAYMENT_POSTED: { email: true, sms: false, whatsapp: false },
  LAYAWAY_DUE_SOON: { email: true, sms: true, whatsapp: true },
  LAYAWAY_OVERDUE: { email: true, sms: true, whatsapp: true },
  LAYAWAY_FORFEITED: { email: true, sms: true, whatsapp: true }
};

export const DEFAULT_TEMPLATES: Array<{
  key: EventKey; channel: Channel; lang: 'ar'|'en'; name: string; subject?: string; body: string; variables: string[];
}> = [
  { key: 'ORDER_CREATED', channel: 'email', lang: 'ar', name: 'تم استلام الطلب', subject: 'تم استلام طلبك رقم {orderCode}', body: 'تم استلام طلبك رقم {orderCode} بتاريخ {orderDate}. شكراً لتسوقك معنا.', variables: ['orderCode','orderDate','customerName','shopName'] },
  { key: 'DELIVERED', channel: 'sms', lang: 'ar', name: 'تم التسليم (SMS)', body: 'تم تسليم طلبك {orderCode}. شكراً لتسوقك معنا.', variables: ['orderCode'] },
  { key: 'LAYAWAY_DUE_SOON', channel: 'whatsapp', lang: 'ar', name: 'تذكير استحقاق (واتساب)', body: 'تذكير: تبقّى {balance} على حجزك {layawayCode}. تاريخ الاستحقاق {dueDate}.', variables: ['balance','layawayCode','dueDate'] },
  { key: 'ORDER_CREATED', channel: 'email', lang: 'en', name: 'Order Received', subject: 'We received your order {orderCode}', body: 'Your order {orderCode} on {orderDate} has been received.', variables: ['orderCode','orderDate','customerName','shopName'] },
  { key: 'DELIVERED', channel: 'sms', lang: 'en', name: 'Delivered (SMS)', body: 'Your order {orderCode} has been delivered. Thank you!', variables: ['orderCode'] },
  { key: 'LAYAWAY_DUE_SOON', channel: 'whatsapp', lang: 'en', name: 'Layaway due soon (WA)', body: 'Reminder: {balance} remaining for your layaway {layawayCode}. Due {dueDate}.', variables: ['balance','layawayCode','dueDate'] }
];

export type Channel = 'email'|'sms'|'whatsapp';
export type EventKey = 'ORDER_CREATED'|'ORDER_PAID'|'SHIPMENT_CREATED'|'OUT_FOR_DELIVERY'|'DELIVERED'|'COD_REMINDER'|'LAYAWAY_CREATED'|'LAYAWAY_PAYMENT_POSTED'|'LAYAWAY_DUE_SOON'|'LAYAWAY_OVERDUE'|'LAYAWAY_FORFEITED';

type TemplateDef = { subject?: string; body: string; variables: string[] };

const defaults: Record<EventKey, Record<Channel, { ar: TemplateDef; en: TemplateDef }>> = {
  ORDER_CREATED: {
    email: {
      ar: { subject: 'تم استلام طلبك رقم {orderCode}', body: 'شكراً {customerName}. رقم الطلب {orderCode} بتاريخ {orderDate}. الإجمالي {grandTotal}.', variables: ['customerName','orderCode','orderDate','grandTotal'] },
      en: { subject: 'We received your order {orderCode}', body: 'Thanks {customerName}. Order {orderCode} on {orderDate}. Total {grandTotal}.', variables: ['customerName','orderCode','orderDate','grandTotal'] }
    },
    sms: {
      ar: { body: 'تم استلام طلبك {orderCode}. شكراً لتسوقك معنا.', variables: ['orderCode'] },
      en: { body: 'We received your order {orderCode}. Thank you!', variables: ['orderCode'] }
    },
    whatsapp: {
      ar: { body: 'مرحباً {customerName}، تم استلام طلبك {orderCode}. رابط التتبع: {trackingLink}', variables: ['customerName','orderCode','trackingLink'] },
      en: { body: 'Hi {customerName}, we received order {orderCode}. Track: {trackingLink}', variables: ['customerName','orderCode','trackingLink'] }
    }
  },
  ORDER_PAID: {
    email: {
      ar: { subject: 'تم استلام الدفع لطلب {orderCode}', body: 'تم تأكيد الدفع ({paymentMethod}) بقيمة {grandTotal}.', variables: ['orderCode','paymentMethod','grandTotal'] },
      en: { subject: 'Payment received for {orderCode}', body: 'Payment ({paymentMethod}) confirmed for {grandTotal}.', variables: ['orderCode','paymentMethod','grandTotal'] }
    },
    sms: {
      ar: { body: 'تم استلام الدفع لطلبك {orderCode}.', variables: ['orderCode'] },
      en: { body: 'We received your payment for {orderCode}.', variables: ['orderCode'] }
    },
    whatsapp: {
      ar: { body: 'تم استلام الدفع لطلب {orderCode}. شكراً', variables: ['orderCode'] },
      en: { body: 'Payment received for {orderCode}. Thanks', variables: ['orderCode'] }
    }
  },
  SHIPMENT_CREATED: {
    email: {
      ar: { subject: 'تم إنشاء شحنتك لطلب {orderCode}', body: 'شركة الشحن: {carrierName}، رقم التتبع: {trackingNumber}.', variables: ['orderCode','carrierName','trackingNumber'] },
      en: { subject: 'Shipment created for {orderCode}', body: 'Carrier: {carrierName}, Tracking: {trackingNumber}.', variables: ['orderCode','carrierName','trackingNumber'] }
    },
    sms: { ar: { body: 'تم إنشاء شحنتك. رقم {trackingNumber}.', variables: ['trackingNumber'] }, en: { body: 'Shipment created. Tracking {trackingNumber}.', variables: ['trackingNumber'] } },
    whatsapp: { ar: { body: 'تم إنشاء الشحنة. رابط التتبع: {trackingLink}', variables: ['trackingLink'] }, en: { body: 'Shipment created. Track: {trackingLink}', variables: ['trackingLink'] } }
  },
  OUT_FOR_DELIVERY: {
    email: { ar: { subject: 'طلبك {orderCode} خرج للتسليم', body: 'سيتم التسليم اليوم إن شاء الله.', variables: ['orderCode'] }, en: { subject: 'Order {orderCode} is out for delivery', body: 'Out for delivery today.', variables: ['orderCode'] } },
    sms: { ar: { body: 'طلبك {orderCode} في طريقه إليك.', variables: ['orderCode'] }, en: { body: 'Your order {orderCode} is on the way.', variables: ['orderCode'] } },
    whatsapp: { ar: { body: 'طلبك {orderCode} مع المندوب.', variables: ['orderCode'] }, en: { body: 'Order {orderCode} with courier.', variables: ['orderCode'] } }
  },
  DELIVERED: {
    email: { ar: { subject: 'تم تسليم طلبك {orderCode}', body: 'شكراً لتسوقك معنا.', variables: ['orderCode'] }, en: { subject: 'Order {orderCode} delivered', body: 'Thank you for shopping.', variables: ['orderCode'] } },
    sms: { ar: { body: 'تم تسليم طلبك {orderCode}. شكراً لتسوقك معنا.', variables: ['orderCode'] }, en: { body: 'Order {orderCode} delivered. Thank you!', variables: ['orderCode'] } },
    whatsapp: { ar: { body: 'تم التسليم للطلب {orderCode}.', variables: ['orderCode'] }, en: { body: 'Delivered: {orderCode}.', variables: ['orderCode'] } }
  },
  COD_REMINDER: {
    email: { ar: { subject: 'تذكير الدفع عند التسليم لطلب {orderCode}', body: 'الرجاء تجهيز مبلغ {grandTotal}.', variables: ['orderCode','grandTotal'] }, en: { subject: 'COD reminder for {orderCode}', body: 'Please prepare {grandTotal}.', variables: ['orderCode','grandTotal'] } },
    sms: { ar: { body: 'تذكير: مبلغ {grandTotal} لطلب {orderCode}.', variables: ['grandTotal','orderCode'] }, en: { body: 'Reminder: {grandTotal} for order {orderCode}.', variables: ['grandTotal','orderCode'] } },
    whatsapp: { ar: { body: 'تذكير دفع {grandTotal} لطلب {orderCode}.', variables: ['grandTotal','orderCode'] }, en: { body: 'COD reminder {grandTotal} for {orderCode}.', variables: ['grandTotal','orderCode'] } }
  },
  LAYAWAY_CREATED: {
    email: { ar: { subject: 'تم إنشاء حجزك {layawayCode}', body: 'الدفعة المقدمة {upfrontPaid}، المتبقي {balance}.', variables: ['layawayCode','upfrontPaid','balance'] }, en: { subject: 'Layaway {layawayCode} created', body: 'Upfront {upfrontPaid}, balance {balance}.', variables: ['layawayCode','upfrontPaid','balance'] } },
    sms: { ar: { body: 'تم إنشاء الحجز {layawayCode}.', variables: ['layawayCode'] }, en: { body: 'Layaway {layawayCode} created.', variables: ['layawayCode'] } },
    whatsapp: { ar: { body: 'حجز {layawayCode} تم إنشاؤه.', variables: ['layawayCode'] }, en: { body: 'Layaway {layawayCode} created.', variables: ['layawayCode'] } }
  },
  LAYAWAY_PAYMENT_POSTED: {
    email: { ar: { subject: 'تم تسجيل الدفعة لحجز {layawayCode}', body: 'المتبقي {balance}.', variables: ['layawayCode','balance'] }, en: { subject: 'Payment posted for {layawayCode}', body: 'Remaining balance {balance}.', variables: ['layawayCode','balance'] } },
    sms: { ar: { body: 'تم تسجيل الدفعة لحجز {layawayCode}.', variables: ['layawayCode'] }, en: { body: 'Payment posted for {layawayCode}.', variables: ['layawayCode'] } },
    whatsapp: { ar: { body: 'دفعة مسجلة لحجز {layawayCode}.', variables: ['layawayCode'] }, en: { body: 'Payment for {layawayCode} recorded.', variables: ['layawayCode'] } }
  },
  LAYAWAY_DUE_SOON: {
    email: { ar: { subject: 'تذكير: استحقاق قريب لحجز {layawayCode}', body: 'تبقّى {balance}. تاريخ الاستحقاق {dueDate}.', variables: ['layawayCode','balance','dueDate'] }, en: { subject: 'Reminder: Layaway {layawayCode} due soon', body: 'Balance {balance}. Due {dueDate}.', variables: ['layawayCode','balance','dueDate'] } },
    sms: { ar: { body: 'تذكير: تبقّى {balance} على حجزك {layawayCode}.', variables: ['balance','layawayCode'] }, en: { body: 'Reminder: {balance} remaining on {layawayCode}.', variables: ['balance','layawayCode'] } },
    whatsapp: { ar: { body: 'تذكير: تبقّى {balance} على حجزك {layawayCode}. تاريخ الاستحقاق {dueDate}.', variables: ['balance','layawayCode','dueDate'] }, en: { body: 'Reminder: {balance} for {layawayCode}. Due {dueDate}.', variables: ['balance','layawayCode','dueDate'] } }
  },
  LAYAWAY_OVERDUE: {
    email: { ar: { subject: 'تنبيه: حجز {layawayCode} متأخر', body: 'الرصيد {balance}. الرجاء التسديد.', variables: ['layawayCode','balance'] }, en: { subject: 'Alert: Layaway {layawayCode} overdue', body: 'Balance {balance}. Please pay.', variables: ['layawayCode','balance'] } },
    sms: { ar: { body: 'تنبيه: حجز {layawayCode} متأخر.', variables: ['layawayCode'] }, en: { body: 'Alert: Layaway {layawayCode} overdue.', variables: ['layawayCode'] } },
    whatsapp: { ar: { body: 'حجز {layawayCode} متأخر. الرصيد {balance}.', variables: ['layawayCode','balance'] }, en: { body: 'Layaway {layawayCode} overdue. Balance {balance}.', variables: ['layawayCode','balance'] } }
  },
  LAYAWAY_FORFEITED: {
    email: { ar: { subject: 'إشعار: مصادرة حجز {layawayCode}', body: 'نأسف لإبلاغك بالمصادرة وفق السياسة.', variables: ['layawayCode'] }, en: { subject: 'Notice: Layaway {layawayCode} forfeited', body: 'We regret to inform per policy.', variables: ['layawayCode'] } },
    sms: { ar: { body: 'تمت مصادرة حجز {layawayCode}.', variables: ['layawayCode'] }, en: { body: 'Layaway {layawayCode} forfeited.', variables: ['layawayCode'] } },
    whatsapp: { ar: { body: 'تمت مصادرة حجز {layawayCode}.', variables: ['layawayCode'] }, en: { body: 'Layaway {layawayCode} forfeited.', variables: ['layawayCode'] } }
  }
};

export function getDefaultTemplate(key: EventKey, channel: Channel, lang: 'ar'|'en'): TemplateDef {
  return defaults[key][channel][lang];
}

export function extractVariables(str: string): string[] {
  const vars = new Set<string>();
  const re = /\{([a-zA-Z0-9_]+)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(str))) vars.add(m[1]);
  return Array.from(vars);
}

export function renderTemplate(body: string, data: Record<string, any>): string {
  return body.replace(/\{([a-zA-Z0-9_]+)\}/g, (_m, v) => {
    const val = data[v];
    return val === undefined || val === null ? `{${v}}` : String(val);
  });
}

export const EVENT_CHANNEL_DEFAULTS: Record<EventKey, Record<Channel, boolean>> = {
  ORDER_CREATED: { email: true, sms: false, whatsapp: false },
  ORDER_PAID: { email: true, sms: false, whatsapp: false },
  SHIPMENT_CREATED: { email: true, sms: false, whatsapp: false },
  OUT_FOR_DELIVERY: { email: true, sms: true, whatsapp: false },
  DELIVERED: { email: true, sms: false, whatsapp: false },
  COD_REMINDER: { email: true, sms: true, whatsapp: false },
  LAYAWAY_CREATED: { email: true, sms: true, whatsapp: false },
  LAYAWAY_PAYMENT_POSTED: { email: true, sms: false, whatsapp: false },
  LAYAWAY_DUE_SOON: { email: true, sms: true, whatsapp: true },
  LAYAWAY_OVERDUE: { email: true, sms: true, whatsapp: true },
  LAYAWAY_FORFEITED: { email: true, sms: true, whatsapp: true },
};

export type Channel = 'email'|'sms'|'whatsapp';
export type EventKey = 'ORDER_CREATED'|'ORDER_PAID'|'SHIPMENT_CREATED'|'OUT_FOR_DELIVERY'|'DELIVERED'|'COD_REMINDER'|'LAYAWAY_CREATED'|'LAYAWAY_PAYMENT_POSTED'|'LAYAWAY_DUE_SOON'|'LAYAWAY_OVERDUE'|'LAYAWAY_FORFEITED';

export const DEFAULT_TEMPLATES: Array<{ key: EventKey; channel: Channel; lang: 'ar'|'en'; name: string; subject?: string; body: string; variables: string[] }>= [
  { key: 'ORDER_CREATED', channel: 'email', lang: 'ar', name: 'إنشاء الطلب', subject: 'تم استلام طلبك رقم {orderCode}', body: 'مرحبًا {customerName},\nتم استلام طلبك رقم {orderCode} بتاريخ {orderDate}. إجمالي {grandTotal}.', variables: ['customerName','orderCode','orderDate','grandTotal'] },
  { key: 'ORDER_PAID', channel: 'email', lang: 'ar', name: 'تم الدفع', subject: 'تم دفع طلبك {orderCode}', body: 'تم استلام الدفع لطلب {orderCode} بطريقة {paymentMethod}.', variables: ['orderCode','paymentMethod'] },
  { key: 'OUT_FOR_DELIVERY', channel: 'sms', lang: 'ar', name: 'خارج للتسليم', body: 'طلبك {orderCode} في طريقه إليك. تابع: {trackingLink}', variables: ['orderCode','trackingLink'] },
  { key: 'DELIVERED', channel: 'sms', lang: 'ar', name: 'تم التسليم', body: 'تم تسليم طلبك {orderCode}. شكراً لتسوقك معنا.', variables: ['orderCode'] },
  { key: 'LAYAWAY_DUE_SOON', channel: 'whatsapp', lang: 'ar', name: 'موعد الاستحقاق قريب', body: 'تذكير: تبقّى {balance} على حجزك {layawayCode}. تاريخ الاستحقاق {dueDate}.', variables: ['balance','layawayCode','dueDate'] },
  // English fallbacks
  { key: 'ORDER_CREATED', channel: 'email', lang: 'en', name: 'Order created', subject: 'We received your order #{orderCode}', body: 'Hi {customerName}, your order {orderCode} on {orderDate}. Total {grandTotal}.', variables: ['customerName','orderCode','orderDate','grandTotal'] },
  { key: 'DELIVERED', channel: 'sms', lang: 'en', name: 'Delivered', body: 'Your order {orderCode} was delivered. Thank you!', variables: ['orderCode'] },
];

export const EVENT_CHANNEL_DEFAULTS: Record<EventKey, { email: boolean; sms: boolean; whatsapp: boolean }> = {
  ORDER_CREATED: { email: true, sms: false, whatsapp: false },
  ORDER_PAID: { email: true, sms: false, whatsapp: false },
  SHIPMENT_CREATED: { email: true, sms: false, whatsapp: false },
  OUT_FOR_DELIVERY: { email: true, sms: true, whatsapp: false },
  DELIVERED: { email: true, sms: false, whatsapp: false },
  COD_REMINDER: { email: true, sms: true, whatsapp: false },
  LAYAWAY_CREATED: { email: true, sms: true, whatsapp: false },
  LAYAWAY_PAYMENT_POSTED: { email: true, sms: false, whatsapp: false },
  LAYAWAY_DUE_SOON: { email: true, sms: true, whatsapp: true },
  LAYAWAY_OVERDUE: { email: true, sms: true, whatsapp: true },
  LAYAWAY_FORFEITED: { email: true, sms: true, whatsapp: true },
};
