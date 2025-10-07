import { Schema, model, models } from 'mongoose';

const AuditLogSchema = new Schema({
  ts: { type: Date, default: () => new Date(), index: true },
  actorUserId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  action: { type: String, required: true, index: true },
  subject: {
    type: { type: String, required: true },
    id: { type: String }
  },
  dataHash: { type: String },
  overrideByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  ip: { type: String },
  ua: { type: String }
}, { timestamps: false });

export type AuditLogDoc = {
  _id?: string;
  ts: Date;
  actorUserId?: string;
  action: string;
  subject: { type: string; id?: string };
  dataHash?: string;
  overrideByUserId?: string;
  ip?: string;
  ua?: string;
};

export const AuditLog = models.AuditLog || model('AuditLog', AuditLogSchema);
