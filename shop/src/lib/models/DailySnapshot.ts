import mongoose, { Schema, model } from 'mongoose';

const TopItemSchema = new Schema({
  sku: { type: String },
  name: { type: String },
  qty: { type: Number, default: 0 },
  netSales: { type: Number, default: 0 }
}, { _id: false });

const TopCategorySchema = new Schema({
  id: { type: String },
  name: { type: String },
  netSales: { type: Number, default: 0 }
}, { _id: false });

const TopBrandSchema = new Schema({
  id: { type: String },
  name: { type: String },
  netSales: { type: Number, default: 0 }
}, { _id: false });

const TopPromoSchema = new Schema({
  id: { type: String },
  name: { type: String },
  value: { type: Number, default: 0 }
}, { _id: false });

const DailySnapshotSchema = new Schema({
  _id: { type: String, required: true }, // yyyy-mm-dd
  tz: { type: String, required: true },
  rangeUtc: { type: new Schema({ start: String, end: String }, { _id: false }), required: true },
  counters: {
    type: new Schema({
      invoices: { type: Number, default: 0 },
      items: { type: Number, default: 0 },
      grossSales: { type: Number, default: 0 },
      discounts: { type: Number, default: 0 },
      returns: { type: Number, default: 0 },
      netSales: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
      roundingAdj: { type: Number, default: 0 },
      shipping: { type: Number, default: 0 },
      cogs: { type: Number, default: 0 },
      margin: { type: Number, default: 0 },
      marginPct: { type: Number, default: 0 }
    }, { _id: false }),
    default: {}
  },
  payments: { type: Object, default: { cash: 0, card: 0, transfer: 0, store_credit: 0, cod: 0 } },
  drawer: { type: new Schema({ openCount: { type: Number, default: 0 }, cashIn: { type: Number, default: 0 }, cashOut: { type: Number, default: 0 } }, { _id: false }), default: undefined },
  top: {
    type: new Schema({
      products: { type: [TopItemSchema], default: [] },
      categories: { type: [TopCategorySchema], default: [] },
      brands: { type: [TopBrandSchema], default: [] },
      promos: { type: [TopPromoSchema], default: [] }
    }, { _id: false }),
    default: {}
  },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true }
}, { minimize: false, timestamps: false });

export const DailySnapshot = (mongoose.models as any).DailySnapshot || model('DailySnapshot', DailySnapshotSchema);

