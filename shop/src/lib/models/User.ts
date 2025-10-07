import { Schema, model, models } from 'mongoose';

export type Role = 'owner'|'manager'|'cashier'|'staff'|'viewer';
export type UserStatus = 'active'|'disabled';

const UserSchema = new Schema({
  email: { type: String, required: true, unique: true, index: true, trim: true, lowercase: true },
  name: { type: String },
  role: { type: String, enum: ['owner','manager','cashier','staff','viewer'], required: true, default: 'viewer', index: true },
  status: { type: String, enum: ['active','disabled'], required: true, default: 'active', index: true },
  hashedPassword: { type: String, required: true },
  pin: { type: String }, // hashed PIN (optional)
  lastLoginAt: { type: Date }
}, { timestamps: true });

export type UserDoc = {
  _id?: string;
  email: string;
  name?: string;
  role: Role;
  status: UserStatus;
  hashedPassword: string;
  pin?: string;
  lastLoginAt?: Date;
};

export const User = models.User || model('User', UserSchema);
