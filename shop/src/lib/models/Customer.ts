import { Schema, model, models } from 'mongoose';

const PhoneSchema = new Schema({
  e164: { type: String, required: true, trim: true },
  raw: { type: String },
  primary: { type: Boolean, default: false }
}, { _id: false });

const AddressSchema = new Schema({
  label: { type: String },
  name_ar: { type: String },
  name_en: { type: String },
  line1: { type: String, required: true },
  line2: { type: String },
  city: { type: String },
  state: { type: String },
  postal: { type: String },
  country: { type: String },
  phone: { type: String },
  isDefault: { type: Boolean, default: false }
}, { _id: false });

const SearchSchema = new Schema({
  name_ar_norm: { type: String, index: true },
  name_en_norm: { type: String, index: true },
  phone_index: { type: [String], index: true }
}, { _id: false });

const ConsentSchema = new Schema({
  marketing: { type: Boolean, default: false },
  sms: { type: Boolean, default: false },
  email: { type: Boolean, default: false },
  whatsapp: { type: Boolean, default: false },
  doNotContact: { type: Boolean, default: false }
}, { _id: false });

const StatsSchema = new Schema({
  lifetimeSpend: { type: Number, default: 0 },
  ordersCount: { type: Number, default: 0 },
  lastOrderAt: { type: String },
  storeCredit: { type: Number, default: 0 }
}, { _id: false });

const CustomerSchema = new Schema({
  firstName_ar: { type: String },
  lastName_ar: { type: String },
  fullName_ar: { type: String },
  firstName_en: { type: String },
  lastName_en: { type: String },
  fullName_en: { type: String },
  phones: { type: [PhoneSchema], default: [] },
  email: { type: String },
  gender: { type: String, enum: ['male','female','other'], default: undefined },
  dob: { type: String },
  tags: { type: [String], default: [] },
  notes: { type: String },
  addresses: { type: [AddressSchema], default: [] },
  search: { type: SearchSchema, default: {} },
  consent: { type: ConsentSchema, default: {} },
  stats: { type: StatsSchema, default: {} },
  createdBy: { type: String },
  updatedBy: { type: String },
  status: { type: String, enum: ['active','archived'], default: 'active', index: true }
}, { timestamps: true, minimize: false });

// Indexes
CustomerSchema.index({ 'phones.e164': 1 }, { unique: true, sparse: true });
CustomerSchema.index({ 'search.name_ar_norm': 1 }, { collation: { locale: 'ar', strength: 1 } });
CustomerSchema.index({ 'search.name_en_norm': 1 });
CustomerSchema.index({ 'search.phone_index': 1 });
CustomerSchema.index({ 'search.name_ar_norm': 1, 'search.name_en_norm': 1, 'phones.e164': 1 });

export type CustomerDoc = {
  _id?: string;
  firstName_ar?: string; lastName_ar?: string; fullName_ar?: string;
  firstName_en?: string; lastName_en?: string; fullName_en?: string;
  phones: Array<{ e164: string; raw?: string; primary?: boolean }>;
  email?: string;
  gender?: 'male'|'female'|'other';
  dob?: string;
  tags?: string[];
  notes?: string;
  addresses?: Array<{
    label?: string; name_ar?: string; name_en?: string; line1: string; line2?: string; city?: string; state?: string; postal?: string; country?: string; phone?: string; isDefault?: boolean;
  }>;
  search: { name_ar_norm?: string; name_en_norm?: string; phone_index?: string[] };
  consent?: { marketing?: boolean; sms?: boolean; email?: boolean; whatsapp?: boolean; doNotContact?: boolean };
  stats?: { lifetimeSpend?: number; ordersCount?: number; lastOrderAt?: string; storeCredit?: number };
  createdAt?: string; updatedAt?: string; createdBy?: string; updatedBy?: string;
  status?: 'active'|'archived';
};

export const Customer = models.Customer || model('Customer', CustomerSchema);

