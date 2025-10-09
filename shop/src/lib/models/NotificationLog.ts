import { Schema, model, models } from 'mongoose';

const ToSchema = new Schema({
  email: { type: String },
  phone: { type: String },
  wa: { type: String }
}, { _id: false });

const EntitySchema = new Schema({
  type: { type: String, enum: ['order','layaway'], required: true },
  id: { type: String, required: true },
  code: { type: String }
}, { _id: false });

const RenderSchema = new Schema({
  lang: { type: String, enum: ['ar','en'], required: true },
  subject: { type: String },
  bodyHash: { type: String, required: true }
}, { _id: false });

const ProviderSchema = new Schema({
  name: { type: String, enum: ['relay_webhook'], required: true },
  responseCode: { type: Number },
  responseId: { type: String }
}, { _id: false });

const NotificationLogSchema = new Schema({
  event: { type: String, required: true, index: true },
  channel: { type: String, enum: ['email','sms','whatsapp'], required: true, index: true },
  entity: { type: EntitySchema, required: true },
  customerId: { type: String, required: true, index: true },
  to: { type: ToSchema, required: true },
  render: { type: RenderSchema, required: true },
  consentChecked: { type: Boolean, default: false },
  idempotencyKey: { type: String, required: true, index: true },
  attempt: { type: Number, default: 0 },
  status: { type: String, enum: ['queued','sent','delivered','failed','bounced','unsubscribed','throttled'], required: true, index: true },
  provider: { type: ProviderSchema },
  error: { type: String },
  createdAt: { type: String, default: () => new Date().toISOString(), index: true },
  updatedAt: { type: String, default: () => new Date().toISOString() }
}, { timestamps: false, minimize: false });

NotificationLogSchema.index({ idempotencyKey: 1, channel: 1 }, { unique: true });
NotificationLogSchema.index({ 'entity.type': 1, 'entity.id': 1, event: 1, channel: 1, createdAt: 1 });
NotificationLogSchema.index({ event: 1 });
NotificationLogSchema.index({ channel: 1 });
NotificationLogSchema.index({ status: 1 });
NotificationLogSchema.index({ createdAt: 1 });

export type NotificationLogDoc = {
  _id?: string;
  event: string;
  channel: 'email'|'sms'|'whatsapp';
  entity: { type: 'order'|'layaway'; id: string; code?: string };
  customerId: string;
  to: { email?: string; phone?: string; wa?: string };
  render: { lang: 'ar'|'en'; subject?: string; bodyHash: string };
  consentChecked: boolean;
  idempotencyKey: string;
  attempt: number;
  status: 'queued'|'sent'|'delivered'|'failed'|'bounced'|'unsubscribed'|'throttled';
  provider?: { name: 'relay_webhook'; responseCode?: number; responseId?: string };
  error?: string;
  createdAt: string; updatedAt: string;
};

export const NotificationLog = models.NotificationLog || model('NotificationLog', NotificationLogSchema);
