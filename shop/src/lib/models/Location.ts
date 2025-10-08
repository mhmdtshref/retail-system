import { Schema, model, models } from 'mongoose';

export type LocationType = 'store' | 'warehouse' | 'returns';

const AddressSchema = new Schema({
  line1: { type: String },
  city: { type: String },
  country: { type: String },
  phone: { type: String },
  postal: { type: String }
}, { _id: false });

const LocationSchema = new Schema({
  code: { type: String, required: true, unique: true, index: true, trim: true },
  name: { type: String, required: true },
  name_ar: { type: String },
  type: { type: String, enum: ['store','warehouse','returns'], required: true, index: true },
  isSellable: { type: Boolean, default: false, index: true },
  isStorageOnly: { type: Boolean, default: false },
  address: { type: AddressSchema, default: {} },
  tz: { type: String },
}, { timestamps: true });

LocationSchema.index({ code: 1 }, { unique: true });

export const Location = models.Location || model('Location', LocationSchema);

export type LocationDoc = {
  _id: string;
  code: string;
  name: string;
  name_ar?: string;
  type: LocationType;
  isSellable: boolean;
  isStorageOnly?: boolean;
  address?: { line1?: string; city?: string; country?: string; phone?: string; postal?: string };
  tz?: string;
  createdAt: string; updatedAt: string;
};
