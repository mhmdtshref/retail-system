import { Schema, model, models } from 'mongoose';

const IdempotencySchema = new Schema({
  key: { type: String, required: true, unique: true, index: true },
  result: { type: Schema.Types.Mixed },
}, { timestamps: true });

export const Idempotency = models.Idempotency || model('Idempotency', IdempotencySchema);

