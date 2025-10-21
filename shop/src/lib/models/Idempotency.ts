import mongoose, { Schema, model } from 'mongoose';

const IdempotencySchema = new Schema({
  key: { type: String, required: true, unique: true, index: true },
  result: { type: Schema.Types.Mixed },
}, { timestamps: true });

export const Idempotency = (mongoose.models as any).Idempotency || model('Idempotency', IdempotencySchema);

