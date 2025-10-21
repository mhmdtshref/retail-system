import mongoose, { Schema, model } from 'mongoose';

const BySkuSchema = new Schema({
  sku: { type: String, required: true },
  name: { type: String },
  units: { type: Number, default: 0 },
  unitCost: { type: Number, default: 0 },
  value: { type: Number, default: 0 }
}, { _id: false });

const ValuationSnapshotSchema = new Schema({
  _id: { type: String, required: true }, // yyyy-mm-dd|METHOD
  asOfLocal: { type: String, required: true },
  method: { type: String, enum: ['FIFO','WAVG'], required: true },
  totals: { type: new Schema({ units: Number, value: Number }, { _id: false }), default: { units: 0, value: 0 } },
  bySku: { type: [BySkuSchema], default: [] },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true }
}, { minimize: false, timestamps: false });

export const ValuationSnapshot = (mongoose.models as any).ValuationSnapshot || model('ValuationSnapshot', ValuationSnapshotSchema);

