import { Schema, model, models } from 'mongoose';
import type { CarrierType } from './CarrierAccount';

export type ShipmentStatus = 'created'|'label_generated'|'handover'|'in_transit'|'out_for_delivery'|'delivered'|'failed'|'returned'|'cancelled';

const AddressSchema = new Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  address1: { type: String, required: true },
  city: { type: String, required: true },
  country: { type: String, required: true },
  postal: { type: String },
}, { _id: false });

const CodSchema = new Schema({
  enabled: { type: Boolean, default: false },
  amount: { type: Number },
  currency: { type: String }
}, { _id: false });

const EventSchema = new Schema({
  code: { type: String },
  status: { type: String, enum: ['created','label_generated','handover','in_transit','out_for_delivery','delivered','failed','returned','cancelled'], required: true },
  desc: { type: String },
  at: { type: Date, default: () => new Date() },
  raw: { type: Schema.Types.Mixed }
}, { _id: false });

const ShipmentSchema = new Schema({
  orderId: { type: String, required: true, index: true },
  carrierAccountId: { type: String, required: true, index: true },
  carrier: { type: String, enum: ['aramex','smsa','dhl','fedex','webhook_generic'], required: true },
  service: { type: String },
  trackingNumber: { type: String, index: true },
  labelUrl: { type: String },
  status: { type: String, enum: ['created','label_generated','handover','in_transit','out_for_delivery','delivered','failed','returned','cancelled'], default: 'created', index: true },
  to: { type: AddressSchema, required: true },
  cod: { type: CodSchema, default: {} },
  weightKg: { type: Number },
  pieces: { type: Number },
  events: { type: [EventSchema], default: [] },
  lastSyncAt: { type: Date },
  nextPollAt: { type: Date, index: true },
  pollAttempt: { type: Number, default: 0 },
  webhookVerified: { type: Boolean },
  createdBy: { type: String }
}, { timestamps: true, minimize: false });

ShipmentSchema.index({ status: 1, nextPollAt: 1 });

export type ShipmentDoc = {
  _id: string;
  orderId: string;
  carrierAccountId: string;
  carrier: CarrierType;
  service?: string;
  trackingNumber?: string;
  labelUrl?: string;
  status: ShipmentStatus;
  to: { name: string; phone: string; address1: string; city: string; country: string; postal?: string };
  cod?: { enabled: boolean; amount: number; currency: string };
  weightKg?: number; pieces?: number;
  events: { code: string; status: ShipmentStatus; desc?: string; at: string; raw?: any }[];
  lastSyncAt?: string; nextPollAt?: string; pollAttempt?: number;
  webhookVerified?: boolean;
  createdAt: string; updatedAt: string; createdBy?: string;
};

export const Shipment = models.Shipment || model('Shipment', ShipmentSchema);

