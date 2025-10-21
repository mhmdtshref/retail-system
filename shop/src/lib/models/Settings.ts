import mongoose, { Schema, model } from 'mongoose';

const ReceiptTemplateSchema = new Schema({
  showLogo: { type: Boolean, default: true },
  showReceiptBarcode: { type: Boolean, default: true },
  showTaxSummary: { type: Boolean, default: true },
  showCashier: { type: Boolean, default: true },
  showCustomer: { type: Boolean, default: true },
  showReturnPolicy: { type: Boolean, default: false },
  showStoreCredit: { type: Boolean, default: true },
  labels: { type: Schema.Types.Mixed, default: {} },
  header: { type: Schema.Types.Mixed, default: {} },
  footer: { type: Schema.Types.Mixed, default: {} },
}, { _id: false });

const ReceiptsConfigSchema = new Schema({
  thermal80: { type: ReceiptTemplateSchema, default: {} },
  a4: { type: ReceiptTemplateSchema, default: {} }
}, { _id: false });

const PaymentRulesSchema = new Schema({
  enabledMethods: { type: [String], default: ['cash','card','transfer','store_credit','partial'] },
  partial: {
    enabled: { type: Boolean, default: false },
    minUpfrontPct: { type: Number, default: 10 },
    maxDays: { type: Number, default: 30 },
    autoCancel: { type: Boolean, default: false },
    forfeitDays: { type: Number, default: 30 },
    graceDays: { type: Number, default: 0 }
  },
  cashierManualDiscountLimitPct: { type: Number, default: 10 },
  drawer: {
    openOnCashSale: { type: Boolean, default: true },
    openOnRefund: { type: Boolean, default: true },
    allowNoSale: { type: Boolean, default: false },
    requireEndShiftCount: { type: Boolean, default: true }
  },
  cash: {
    allowChange: { type: Boolean, default: true },
    roundingIncrement: { type: Number, default: null }
  },
  card: {
    requireLast4: { type: Boolean, default: false },
    requireRef: { type: Boolean, default: false }
  },
  transfer: {
    requireRef: { type: Boolean, default: true }
  }
}, { _id: false });

const NotificationsConfigSchema = new Schema({
  channels: { type: new Schema({ email: { type: Boolean, default: true }, sms: { type: Boolean, default: false }, whatsapp: { type: Boolean, default: false } }, { _id: false }), default: { email: true, sms: false, whatsapp: false } },
  email: { type: new Schema({ fromName: { type: String }, fromAddress: { type: String }, relayWebhookUrl: { type: String } }, { _id: false }), default: {} },
  sms: { type: new Schema({ senderId: { type: String }, relayWebhookUrl: { type: String } }, { _id: false }), default: {} },
  whatsapp: { type: new Schema({ waNumber: { type: String }, relayWebhookUrl: { type: String } }, { _id: false }), default: {} },
  throttling: { type: new Schema({ hoursPerEvent: { type: Number, default: 24 } }, { _id: false }), default: { hoursPerEvent: 24 } },
  autoSend: { type: Schema.Types.Mixed, default: {} },
  webhook: { type: new Schema({ url: { type: String }, secret: { type: String } }, { _id: false }), default: {} }
}, { _id: false });

const LocalesConfigSchema = new Schema({
  defaultLang: { type: String, enum: ['ar','en'], default: 'ar' },
  rtlByLang: { type: Schema.Types.Mixed, default: { ar: true, en: false } },
  currency: { type: String, default: 'SAR' },
  displayLocale: { type: String, default: 'ar-SA' },
  dateFormat: { type: String, default: 'dd/MM/yyyy' },
  timeFormat: { type: String, enum: ['12h','24h'], default: '12h' },
  shopInfo: {
    name_ar: { type: String, default: '' },
    name_en: { type: String },
    phone: { type: String },
    taxNumber: { type: String },
    address_ar: { type: String },
    address_en: { type: String }
  }
}, { _id: false });

const DeliverySettingsSchema = new Schema({
  defaultCarrierAccountId: { type: String },
  webhookBaseUrl: { type: String }
}, { _id: false });

const SupportConfigSchema = new Schema({
  email: { type: String },
  phone: { type: String }, // e.g., whatsapp:+9665...
  helpUrl: { type: String },
  returnsUrl: { type: String },
  allowCustomerInitiatedReturn: { type: Boolean, default: false }
}, { _id: false });

const SettingsSchema = new Schema({
  _id: { type: String, default: 'global' },
  version: { type: Number, default: 1 },
  payments: { type: PaymentRulesSchema, default: {} },
  locales: { type: LocalesConfigSchema, default: {} },
  receipts: { type: ReceiptsConfigSchema, default: {} },
  notifications: { type: NotificationsConfigSchema, default: {} },
  delivery: { type: DeliverySettingsSchema, default: {} },
  support: { type: SupportConfigSchema, default: {} },
  updatedAt: { type: Date, default: () => new Date() },
  updatedBy: { type: String }
}, { timestamps: false, minimize: false });

export type SettingsDoc = {
  _id: 'global';
  version: number;
  payments: any;
  locales: any;
  receipts: any;
  notifications?: any;
  delivery?: { defaultCarrierAccountId?: string; webhookBaseUrl?: string };
  support?: {
    email?: string;
    phone?: string;
    helpUrl?: string;
    returnsUrl?: string;
    allowCustomerInitiatedReturn?: boolean;
  };
  updatedAt: string;
  updatedBy: string;
};

export const Settings = (mongoose.models as any).Settings || model('Settings', SettingsSchema);

