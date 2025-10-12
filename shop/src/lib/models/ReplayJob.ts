import { Schema, model, models } from 'mongoose';

export type ReplayKind = 'webhook'|'delivery'|'notification'|'outbox';

const StatsSchema = new Schema({
  success: { type: Number, default: 0 },
  failed: { type: Number, default: 0 },
}, { _id: false });

const ReplayJobSchema = new Schema({
  jobId: { type: String, required: true, unique: true, index: true },
  kind: { type: String, enum: ['webhook','delivery','notification','outbox'], required: true, index: true },
  ids: { type: [String], default: [] },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 5 },
  backoffMs: { type: Number, default: 1000 },
  status: { type: String, enum: ['queued','running','success','partial','failed','canceled'], default: 'queued', index: true },
  stats: { type: StatsSchema },
  error: { type: String },
  createdBy: { type: String, required: true, index: true },
  createdAt: { type: Date, default: () => new Date(), index: true },
  finishedAt: { type: Date },
}, { timestamps: false, minimize: false });

ReplayJobSchema.index({ createdAt: -1 });

export type ReplayJobDoc = {
  _id?: string; jobId: string; kind: ReplayKind; ids: string[]; attempts?: number;
  maxAttempts?: number; backoffMs?: number; status: 'queued'|'running'|'success'|'partial'|'failed'|'canceled';
  stats?: { success: number; failed: number }; error?: string; createdBy: string; createdAt: string; finishedAt?: string;
};

export const ReplayJob = models.ReplayJob || model('ReplayJob', ReplayJobSchema);
