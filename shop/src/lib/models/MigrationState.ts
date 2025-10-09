import { Schema, model, models } from 'mongoose';

const MigrationStateSchema = new Schema({
  _id: { type: String, required: true }, // version key e.g., 2025-10-09_001
  name: { type: String, required: true },
  hash: { type: String, required: true },
  appliedAt: { type: Date },
  durationMs: { type: Number },
  notes: { type: String },
}, { timestamps: false });

MigrationStateSchema.index({ _id: 1 }, { unique: true });

export type MigrationStateDoc = {
  _id: string;
  name: string;
  hash: string;
  appliedAt?: string;
  durationMs?: number;
  notes?: string;
};

export const MigrationState = models.MigrationState || model('MigrationState', MigrationStateSchema);
