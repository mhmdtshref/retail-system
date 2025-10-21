import mongoose, { Schema, model } from 'mongoose';

export type CarrierType = 'aramex'|'smsa'|'dhl'|'fedex'|'webhook_generic';

const PickupSchema = new Schema({
  name: { type: String },
  phone: { type: String },
  address1: { type: String, required: true },
  city: { type: String, required: true },
  country: { type: String, required: true },
  postal: { type: String }
}, { _id: false });

const CodSchema = new Schema({
  enabled: { type: Boolean, default: false },
  remitDays: { type: Number }
}, { _id: false });

const RoutingSchema = new Schema({
  countries: { type: [String], default: undefined },
  cities: { type: [String], default: undefined },
  weightMinKg: { type: Number },
  weightMaxKg: { type: Number },
  codOnly: { type: Boolean },
  nonCodOnly: { type: Boolean },
  priority: { type: Number, default: 100 }
}, { _id: false });

const CarrierAccountSchema = new Schema({
  type: { type: String, enum: ['aramex','smsa','dhl','fedex','webhook_generic'], required: true, index: true },
  name: { type: String, required: true },
  enabled: { type: Boolean, default: false, index: true },
  credentials: { type: Schema.Types.Mixed, default: {} },
  defaultService: { type: String },
  pickup: { type: PickupSchema, required: true },
  cod: { type: CodSchema, default: {} },
  routing: { type: RoutingSchema, default: {} },
}, { timestamps: true, minimize: false });

CarrierAccountSchema.index({ type: 1, enabled: 1 });
CarrierAccountSchema.index({ 'routing.priority': 1 });

export type CarrierAccountDoc = {
  _id: string;
  type: CarrierType;
  name: string;
  enabled: boolean;
  credentials: Record<string, string>;
  defaultService?: string;
  pickup: { name?: string; phone?: string; address1: string; city: string; country: string; postal?: string };
  cod?: { enabled: boolean; remitDays?: number };
  routing?: { countries?: string[]; cities?: string[]; weightMinKg?: number; weightMaxKg?: number; codOnly?: boolean; nonCodOnly?: boolean; priority?: number };
  createdAt: string; updatedAt: string;
};

export const CarrierAccount = (mongoose.models as any).CarrierAccount || model('CarrierAccount', CarrierAccountSchema);

