import { Schema, model, models } from 'mongoose';

const AccountsSchema = new Schema({
  sales: { type: String, required: true },
  returns: { type: String, required: true },
  discounts: { type: String, required: true },
  taxPayable: { type: String, required: true },
  rounding: { type: String, required: true },
  cogs: { type: String, required: true },
  inventory: { type: String, required: true },
  cash: { type: String, required: true },
  cardClearing: { type: String, required: true },
  transfer: { type: String, required: true },
  codClearing: { type: String, required: true },
  storeCreditLiability: { type: String, required: true },
  storeCreditExpense: { type: String },
  ar: { type: String },
  layawayAr: { type: String },
  inventoryGainLoss: { type: String }
}, { _id: false });

const BankAccountsSchema = new Schema({
  cash: { type: String },
  card: { type: String },
  transfer: { type: String }
}, { _id: false });

const AccountingSettingsSchema = new Schema({
  _id: { type: String, default: 'global' },
  provider: { type: String, enum: ['generic_csv','quickbooks_csv','xero_csv'], default: 'generic_csv' },
  tz: { type: String, default: 'Asia/Riyadh' },
  baseCurrency: { type: String, default: 'SAR' },
  consolidation: { type: String, enum: ['daily_summary','per_receipt'], default: 'daily_summary' },
  dateBasis: { type: String, enum: ['order_date','payment_date'], default: 'order_date' },
  accounts: { type: AccountsSchema, required: true },
  bankAccounts: { type: BankAccountsSchema },
  lastExportAt: { type: String },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() },
  updatedBy: { type: String }
}, { minimize: false, timestamps: false });

export type AccountingSettingsDoc = {
  _id: 'global';
  provider: 'generic_csv'|'quickbooks_csv'|'xero_csv';
  tz: string; baseCurrency: string;
  consolidation: 'daily_summary'|'per_receipt';
  dateBasis: 'order_date'|'payment_date';
  accounts: {
    sales: string; returns: string; discounts: string; taxPayable: string;
    rounding: string; cogs: string; inventory: string;
    cash: string; cardClearing: string; transfer: string; codClearing: string;
    storeCreditLiability: string; storeCreditExpense?: string;
    ar?: string; layawayAr?: string; inventoryGainLoss?: string;
  };
  bankAccounts?: { cash?: string; card?: string; transfer?: string };
  lastExportAt?: string;
  createdAt: string; updatedAt: string; updatedBy?: string;
};

export const AccountingSettings = models.AccountingSettings || model('AccountingSettings', AccountingSettingsSchema);

