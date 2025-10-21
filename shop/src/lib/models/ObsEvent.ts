import mongoose, { Schema, model } from 'mongoose';

const ObsEventSchema = new Schema({
  kind: { type: String, enum: ['error','slow-query','request-slow'], required: true, index: true },
  level: { type: String, enum: ['info','warn','error'], default: 'info' },
  route: { type: String, index: true },
  method: { type: String },
  status: { type: Number },
  collection: { type: String },
  op: { type: String },
  durationMs: { type: Number },
  message: { type: String },
  stackHash: { type: String },
  requestId: { type: String },
  correlationId: { type: String },
  user: { idHash: { type: String, index: true }, role: { type: String } },
  createdAt: { type: Date, default: () => new Date(), index: true }
}, { timestamps: false, minimize: false });

ObsEventSchema.index({ createdAt: -1 });
ObsEventSchema.index({ kind: 1 });
ObsEventSchema.index({ route: 1 });

export type ObsEventDoc = {
  _id?: string;
  kind: 'error'|'slow-query'|'request-slow';
  level?: 'info'|'warn'|'error';
  route?: string; method?: string; status?: number;
  collection?: string; op?: string; durationMs?: number;
  message?: string; stackHash?: string;
  requestId?: string; correlationId?: string;
  user?: { idHash?: string; role?: string };
  createdAt: string;
};

export const ObsEvent = (mongoose.models as any).ObsEvent || model('ObsEvent', ObsEventSchema);
