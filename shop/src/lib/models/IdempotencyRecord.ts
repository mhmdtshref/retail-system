import { Schema, model, models } from 'mongoose';

const EntitySchema = new Schema({
  type: { type: String },
  id: { type: String },
  code: { type: String },
}, { _id: false });

const IdempotencyRecordSchema = new Schema({
  _id: { type: String }, // key
  route: { type: String, required: true, index: true },
  method: { type: String, enum: ['POST','PATCH','PUT','DELETE'], required: true },
  requestHash: { type: String, required: true },
  responseHash: { type: String },
  entity: { type: EntitySchema },
  createdAt: { type: Date, default: () => new Date(), index: true },
  expiresAt: { type: Date },
  hits: { type: Number, default: 1 },
  payloadPreview: { type: Schema.Types.Mixed },
}, { timestamps: false, minimize: false });

IdempotencyRecordSchema.index({ createdAt: -1 });
IdempotencyRecordSchema.index({ route: 1 });
IdempotencyRecordSchema.index({ 'entity.type': 1, 'entity.id': 1 });

export type IdempotencyRecordDoc = {
  _id: string; route: string; method: 'POST'|'PATCH'|'PUT'|'DELETE'; requestHash: string; responseHash?: string;
  entity?: { type?: string; id?: string; code?: string }; createdAt: string; expiresAt?: string; hits: number; payloadPreview?: Record<string, any>;
};

export const IdempotencyRecord = models.IdempotencyRecord || model('IdempotencyRecord', IdempotencyRecordSchema);
