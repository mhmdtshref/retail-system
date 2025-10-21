import mongoose, { Schema, model, Types } from 'mongoose';

const LayawayPaymentSchema = new Schema({
  paymentId: { type: String, required: true },
  method: { type: String, enum: ['cash','card','transfer','store_credit'], required: true },
  amount: { type: Number, required: true },
  at: { type: String, required: true }
}, { _id: false });

const LayawayItemSchema = new Schema({
  sku: { type: String, required: true },
  name_ar: { type: String },
  variant: { type: String },
  qty: { type: Number, required: true },
  unitPrice: { type: Number, required: true }
}, { _id: false });

const TotalsSchema = new Schema({
  grandTotal: { type: Number, required: true },
  upfrontPaid: { type: Number, required: true },
  balance: { type: Number, required: true }
}, { _id: false });

const ReminderSchema = new Schema({
  doNotContact: { type: Boolean, default: false },
  lastEmailAt: { type: String },
  lastSmsAt: { type: String },
  lastWebhookAt: { type: String }
}, { _id: false });

const AuditSchema = new Schema({
  createdBy: { type: String },
  updatedBy: { type: String }
}, { _id: false });

const LayawaySchema = new Schema({
  code: { type: String, required: true, index: true, unique: true },
  customerId: { type: Types.ObjectId, ref: 'Customer', required: true, index: true },
  saleId: { type: Types.ObjectId, ref: 'Sale', required: true },
  items: { type: [LayawayItemSchema], default: [] },
  totals: { type: TotalsSchema, required: true },
  payments: { type: [LayawayPaymentSchema], default: [] },
  status: { type: String, enum: ['active','overdue','completed','canceled','forfeited'], required: true, index: true },
  createdAt: { type: String, required: true },
  dueAt: { type: String, required: true, index: true },
  lastPaymentAt: { type: String },
  completedAt: { type: String },
  canceledAt: { type: String },
  forfeitedAt: { type: String },
  notes: { type: String },
  reminder: { type: ReminderSchema, default: {} },
  audit: { type: AuditSchema, default: {} }
}, { timestamps: false, minimize: false });

// Compound indexes for aging queries
LayawaySchema.index({ customerId: 1, status: 1 });
LayawaySchema.index({ dueAt: 1, status: 1 });

export type LayawayDoc = {
  _id?: string;
  code: string;
  customerId: string;
  saleId: string;
  items: { sku: string; name_ar?: string; variant?: string; qty: number; unitPrice: number }[];
  totals: { grandTotal: number; upfrontPaid: number; balance: number };
  payments: { paymentId: string; method: 'cash'|'card'|'transfer'|'store_credit'; amount: number; at: string }[];
  status: 'active'|'overdue'|'completed'|'canceled'|'forfeited';
  createdAt: string;
  dueAt: string;
  lastPaymentAt?: string;
  completedAt?: string;
  canceledAt?: string;
  forfeitedAt?: string;
  notes?: string;
  reminder?: { doNotContact?: boolean; lastEmailAt?: string; lastSmsAt?: string; lastWebhookAt?: string };
  audit?: { createdBy: string; updatedBy?: string };
};

export const Layaway = (mongoose.models as any).Layaway || model('Layaway', LayawaySchema);

