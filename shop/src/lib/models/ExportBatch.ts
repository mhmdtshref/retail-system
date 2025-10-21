import mongoose, { Schema, model } from 'mongoose';

const FileSchema = new Schema({
  kind: { type: String, enum: ['journal','bank'], required: true },
  name: { type: String, required: true },
  sha256: { type: String, required: true },
  bytes: { type: Number, required: true }
}, { _id: false });

const RangeLocalSchema = new Schema({
  start: { type: String, required: true },
  end: { type: String, required: true }
}, { _id: false });

const TotalsSchema = new Schema({
  debit: { type: Number, default: 0 },
  credit: { type: Number, default: 0 },
  roundingAdj: { type: Number, default: 0 },
  sales: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  payments: { type: Number, default: 0 },
  cogs: { type: Number, default: 0 }
}, { _id: false });

const ExportBatchSchema = new Schema({
  _id: { type: String, required: true },
  rangeLocal: { type: RangeLocalSchema, required: true },
  tz: { type: String, required: true },
  baseCurrency: { type: String, required: true },
  profile: { type: String, enum: ['generic_csv','quickbooks_csv','xero_csv'], required: true },
  consolidation: { type: String, enum: ['daily_summary','per_receipt'], required: true },
  dateBasis: { type: String, enum: ['order_date','payment_date'], required: true },
  paramsHash: { type: String, required: true, index: true },
  rowCount: { type: Number, default: 0 },
  files: { type: [FileSchema], default: [] },
  totals: { type: TotalsSchema, default: {} },
  createdBy: { type: String, required: true },
  createdAt: { type: String, default: () => new Date().toISOString() },
  status: { type: String, enum: ['ready','posted','voided'], default: 'ready', index: true }
}, { minimize: false, timestamps: false });

ExportBatchSchema.index({ createdAt: -1 });

export type ExportBatchDoc = {
  _id: string;
  rangeLocal: { start: string; end: string };
  tz: string; baseCurrency: string; profile: 'generic_csv'|'quickbooks_csv'|'xero_csv';
  consolidation: 'daily_summary'|'per_receipt';
  dateBasis: 'order_date'|'payment_date';
  paramsHash: string; rowCount: number; files: { kind: 'journal'|'bank'; name: string; sha256: string; bytes: number }[];
  totals: { debit: number; credit: number; roundingAdj: number; sales: number; tax: number; payments: number; cogs: number };
  createdBy: string; createdAt: string; status: 'ready'|'posted'|'voided';
};

export const ExportBatch = (mongoose.models as any).ExportBatch || model('ExportBatch', ExportBatchSchema);

