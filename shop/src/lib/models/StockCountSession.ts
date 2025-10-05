import { Schema, model, models, Types } from 'mongoose';

const ScopeSchema = new Schema({
  type: { type: String, enum: ['all','filter','upload'], required: true },
  filter: { type: Object },
  uploadFileUrl: { type: String },
}, { _id: false });

const CountItemSchema = new Schema({
  sku: { type: String, required: true, index: true },
  onHandAtStart: { type: Number, required: true },
  counted: { type: Number },
  variance: { type: Number },
  recount: { type: Boolean, default: false },
  note: { type: String },
}, { _id: false });

const StockCountSessionSchema = new Schema({
  name: { type: String, required: true },
  status: { type: String, enum: ['open','reviewing','posted'], default: 'open', index: true },
  scope: { type: ScopeSchema, required: true },
  location: { type: String },
  items: { type: [CountItemSchema], default: [] },
  postedAt: { type: Date },
  createdBy: { type: String },
  updatedBy: { type: String },
  refMovementIds: { type: [Types.ObjectId], default: [] },
}, { timestamps: true });

export const StockCountSession = models.StockCountSession || model('StockCountSession', StockCountSessionSchema);


