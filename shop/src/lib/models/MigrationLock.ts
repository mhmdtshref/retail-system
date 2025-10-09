import { Schema, model, models } from 'mongoose';

const MigrationLockSchema = new Schema({
  _id: { type: String, default: 'migration-lock' },
  owner: { type: String },
  createdAt: { type: Date, default: () => new Date(), index: true },
  ttlSec: { type: Number, default: 900 }
}, { timestamps: false });

MigrationLockSchema.index({ createdAt: 1 }, { expireAfterSeconds: 900 });

export type MigrationLockDoc = {
  _id?: string;
  owner?: string;
  createdAt?: string;
  ttlSec?: number;
};

export const MigrationLock = models.MigrationLock || model('MigrationLock', MigrationLockSchema);
