import mongoose, { Schema, model } from 'mongoose';

const FileSchema = new Schema({
  name: { type: String, required: true },
  sha256: { type: String, required: true },
  bytes: { type: Number, required: true },
  count: { type: Number }
}, { _id: false });

const DestinationSchema = new Schema({
  type: { type: String, enum: ['local','s3'], required: true },
  path: { type: String },
  bucket: { type: String },
  prefix: { type: String }
}, { _id: false });

const RetentionSchema = new Schema({
  daily: { type: Number, default: 7 },
  weekly: { type: Number, default: 4 },
  monthly: { type: Number, default: 12 },
}, { _id: false });

const BackupJobSchema = new Schema({
  kind: { type: String, enum: ['backup','restore'], required: true, index: true },
  collections: { type: [String], default: [] },
  destination: { type: DestinationSchema, required: true },
  source: { type: DestinationSchema },
  encrypted: { type: Boolean, default: false },
  manifestSha256: { type: String },
  fingerprintSha256: { type: String },
  retention: { type: RetentionSchema, default: { daily: 7, weekly: 4, monthly: 12 } },
  status: { type: String, enum: ['queued','running','success','failed','canceled'], default: 'queued', index: true },
  startedAt: { type: Date },
  finishedAt: { type: Date },
  bytes: { type: Number, default: 0 },
  files: { type: [FileSchema], default: [] },
  error: { type: String },
  createdBy: { type: String },
  createdAt: { type: Date, default: () => new Date(), index: true },
  logs: { type: [String], default: [] }
}, { minimize: false, timestamps: false });

BackupJobSchema.index({ createdAt: -1 });

export type BackupJobDoc = {
  _id?: string;
  kind: 'backup'|'restore';
  collections: string[];
  destination: { type: 'local'|'s3'; path?: string; bucket?: string; prefix?: string };
  source?: { type: 'local'|'s3'; path?: string; bucket?: string; prefix?: string };
  encrypted?: boolean; manifestSha256?: string; fingerprintSha256?: string;
  retention?: { daily: number; weekly: number; monthly: number };
  status: 'queued'|'running'|'success'|'failed'|'canceled';
  startedAt?: string; finishedAt?: string;
  bytes?: number; files?: { name: string; sha256: string; bytes: number; count?: number }[];
  error?: string; logs?: string[];
  createdBy?: string; createdAt?: string;
};

export const BackupJob = (mongoose.models as any).BackupJob || model('BackupJob', BackupJobSchema);
