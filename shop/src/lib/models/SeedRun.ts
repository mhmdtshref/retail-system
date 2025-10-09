import { Schema, model, models } from 'mongoose';

const SeedRunSchema = new Schema({
  pack: { type: String, enum: ['dev-minimal','demo','test-fixtures','anonymize-staging'], required: true },
  args: { type: Schema.Types.Mixed },
  status: { type: String, enum: ['success','failed'], required: true },
  createdBy: { type: String },
  createdAt: { type: Date, default: () => new Date(), index: true },
  durationMs: { type: Number },
  log: { type: String }
}, { timestamps: false, minimize: false });

SeedRunSchema.index({ createdAt: -1 });

export type SeedRunDoc = {
  _id?: string;
  pack: 'dev-minimal'|'demo'|'test-fixtures'|'anonymize-staging';
  args?: Record<string, any>;
  status: 'success'|'failed';
  createdBy?: string; createdAt?: string; durationMs?: number; log?: string;
};

export const SeedRun = models.SeedRun || model('SeedRun', SeedRunSchema);
