import { Schema, model, models } from 'mongoose';

const ObsSettingsSchema = new Schema({
  _id: { type: String, default: 'global' },
  sampling: { type: new Schema({ info: { type: Number, default: 0.1 }, debug: { type: Number, default: 0 } }, { _id: false }), default: { info: 0.1, debug: 0 } },
  clientLogsEnabled: { type: Boolean, default: true },
  metrics: { type: new Schema({ exposePublic: { type: Boolean, default: false } }, { _id: false }), default: { exposePublic: false } },
  errors: { type: new Schema({ provider: { type: String, enum: ['none','sentry-webhook','console'], default: 'console' }, dsn: { type: String }, webhookUrl: { type: String } }, { _id: false }), default: { provider: 'console' } },
  updatedAt: { type: Date, default: () => new Date() },
  updatedBy: { type: String }
}, { timestamps: false, minimize: false });

export type ObsSettingsDoc = {
  _id: 'global';
  sampling: { info: number; debug: number };
  clientLogsEnabled: boolean;
  metrics: { exposePublic: boolean };
  errors: { provider: 'none'|'sentry-webhook'|'console'; dsn?: string; webhookUrl?: string };
  updatedAt: string; updatedBy?: string;
};

export const ObsSettings = models.ObsSettings || model('ObsSettings', ObsSettingsSchema);
