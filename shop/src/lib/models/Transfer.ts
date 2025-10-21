import mongoose, { Schema, model, Types } from 'mongoose';

export type TransferStatus = 'draft'|'requested'|'approved'|'picking'|'dispatched'|'received'|'closed'|'canceled';

const TransferLineSchema = new Schema({
  sku: { type: String, required: true },
  variantId: { type: String },
  qty: { type: Number, required: true },
  picked: { type: Number, default: 0 },
  received: { type: Number, default: 0 }
}, { _id: false });

const TransferSchema = new Schema({
  code: { type: String, required: true, unique: true, index: true },
  fromLocationId: { type: String, required: true, index: true },
  toLocationId: { type: String, required: true, index: true },
  status: { type: String, enum: ['draft','requested','approved','picking','dispatched','received','closed','canceled'], required: true, default: 'draft', index: true },
  lines: { type: [TransferLineSchema], default: [] },
  inTransit: { type: Boolean, default: false },
  notes: { type: String },
  audit: { createdBy: { type: String, required: true }, updatedBy: { type: String } },
}, { timestamps: true });

TransferSchema.index({ status: 1, createdAt: -1 });
TransferSchema.index({ fromLocationId: 1 });
TransferSchema.index({ toLocationId: 1 });
TransferSchema.index({ code: 1 }, { unique: true });

export const Transfer = (mongoose.models as any).Transfer || model('Transfer', TransferSchema);

export type TransferDoc = {
  _id: string;
  code: string;
  fromLocationId: string;
  toLocationId: string;
  status: TransferStatus;
  lines: { sku: string; variantId?: string; qty: number; picked?: number; received?: number }[];
  inTransit?: boolean;
  notes?: string;
  audit: { createdBy: string; updatedBy?: string };
  createdAt: string; updatedAt: string;
};
