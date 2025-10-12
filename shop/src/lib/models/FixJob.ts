import { Schema, model, models } from 'mongoose';

export type FixKind = 'order_totals'|'stock_reserved'|'layaway_balance'|'orphan_payments'|'transfer_state'|'customer_merge';

const CountsSchema = new Schema({
  scanned: { type: Number, default: 0 },
  changed: { type: Number, default: 0 },
  errors: { type: Number, default: 0 },
}, { _id: false });

const ResultSchema = new Schema({
  reportUrl: { type: String },
}, { _id: false });

const FixJobSchema = new Schema({
  jobId: { type: String, required: true, unique: true, index: true },
  kind: { type: String, enum: ['order_totals','stock_reserved','layaway_balance','orphan_payments','transfer_state','customer_merge'], required: true, index: true },
  params: { type: Schema.Types.Mixed, default: {} },
  dryRun: { type: Boolean, default: true },
  counts: { type: CountsSchema },
  result: { type: ResultSchema },
  status: { type: String, enum: ['queued','running','success','failed','canceled'], default: 'queued', index: true },
  error: { type: String },
  createdBy: { type: String, required: true, index: true },
  createdAt: { type: Date, default: () => new Date(), index: true },
  finishedAt: { type: Date },
}, { timestamps: false, minimize: false });

FixJobSchema.index({ createdAt: -1 });

export type FixJobDoc = {
  _id?: string; jobId: string; kind: FixKind; params: Record<string, any>; dryRun: boolean;
  counts?: { scanned: number; changed: number; errors: number };
  result?: { reportUrl?: string };
  status: 'queued'|'running'|'success'|'failed'|'canceled';
  error?: string; createdBy: string; createdAt: string; finishedAt?: string;
};

export const FixJob = models.FixJob || model('FixJob', FixJobSchema);
