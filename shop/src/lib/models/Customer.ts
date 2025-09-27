import { Schema, model, models } from 'mongoose';

const CustomerSchema = new Schema({
  name: { type: String, required: true },
  phone: { type: String, index: true },
  address: String,
}, { timestamps: true });

export const Customer = models.Customer || model('Customer', CustomerSchema);

