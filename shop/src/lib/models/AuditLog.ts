import mongoose, { Schema, model } from 'mongoose';

// Expanded schema to support structured, privacy-preserving audit events while
// remaining backward-compatible with previous fields used in the codebase.
const AuditLogSchema = new Schema({
  // New canonical fields
  action: { type: String, required: true, index: true },
  actor: {
    id: { type: String, index: true },
    role: { type: String },
  },
  entity: {
    type: { type: String },
    id: { type: String, index: true },
    code: { type: String }
  },
  status: { type: String, enum: ['success','denied','failed'], default: 'success', index: true },
  ip: { type: String },
  ua: { type: String },
  requestId: { type: String },
  correlationId: { type: String },
  beforeHash: { type: String },
  afterHash: { type: String },
  meta: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: () => new Date(), index: true },

  // Legacy compatibility fields (kept optional)
  ts: { type: Date },
  actorUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  subject: {
    type: { type: String },
    id: { type: String }
  },
  dataHash: { type: String },
  overrideByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: false });

export type AuditLogDoc = {
  _id?: string;
  action: string;
  actor?: { id?: string; role?: string };
  entity?: { type?: string; id?: string; code?: string };
  status?: 'success' | 'denied' | 'failed';
  ip?: string;
  ua?: string;
  requestId?: string;
  correlationId?: string;
  beforeHash?: string;
  afterHash?: string;
  meta?: Record<string, string | number | boolean>;
  createdAt?: Date;
  // legacy
  ts?: Date;
  actorUserId?: string;
  subject?: { type?: string; id?: string };
  dataHash?: string;
  overrideByUserId?: string;
};

export const AuditLog = (mongoose.models as any).AuditLog || model('AuditLog', AuditLogSchema);
