import { Schema, model, models } from 'mongoose';

const ImportRowSchema = new Schema({
  idx: { type: Number, required: true },
  data: { type: Schema.Types.Mixed, required: true },
  status: { type: String, enum: ['pending', 'valid', 'invalid', 'applied'], default: 'pending' },
  messages: [{ type: String }]
}, { _id: false });

const ImportBatchSchema = new Schema({
  type: { type: String, enum: ['products-basic'], required: true },
  headers: [{ type: String }],
  mapping: { type: Schema.Types.Mixed },
  rows: [ImportRowSchema],
  summary: { type: Schema.Types.Mixed },
  status: { type: String, enum: ['uploaded', 'validated', 'applied', 'failed'], default: 'uploaded' },
}, { timestamps: true });

export type ImportRow = { idx: number; data: Record<string, any>; status: 'pending'|'valid'|'invalid'|'applied'; messages?: string[] };
export type ImportBatchDoc = {
  _id?: string;
  type: 'products-basic';
  headers: string[];
  mapping?: Record<string, string>;
  rows: ImportRow[];
  summary?: any;
  status: 'uploaded'|'validated'|'applied'|'failed';
};

export const ImportBatch = models.ImportBatch || model('ImportBatch', ImportBatchSchema);


