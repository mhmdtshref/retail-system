import mongoose, { Schema, model } from 'mongoose';

const TemplateSchema = new Schema({
  key: { type: String, required: true, index: true },
  channel: { type: String, enum: ['email','sms','whatsapp'], required: true, index: true },
  lang: { type: String, enum: ['ar','en'], required: true, index: true },
  name: { type: String, required: true },
  subject: { type: String },
  body: { type: String, required: true },
  variables: { type: [String], default: [] },
  version: { type: Number, default: 1 },
  lastEditedBy: { type: String },
  updatedAt: { type: String, default: () => new Date().toISOString() }
}, { timestamps: false, minimize: false });

TemplateSchema.index({ key: 1, channel: 1, lang: 1 }, { unique: true });

export type TemplateDoc = {
  _id?: string;
  key: string;
  channel: 'email'|'sms'|'whatsapp';
  lang: 'ar'|'en';
  name: string;
  subject?: string;
  body: string;
  variables: string[];
  version: number;
  lastEditedBy?: string;
  updatedAt: string;
};

export const NotificationTemplate = (mongoose.models as any).NotificationTemplate || model('NotificationTemplate', TemplateSchema);
