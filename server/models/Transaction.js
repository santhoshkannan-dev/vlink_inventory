import mongoose from 'mongoose';
import crypto from 'crypto';

const transactionSchema = new mongoose.Schema({
  transactionId: { 
    type: String, 
    unique: true, 
    sparse: true, 
    index: true 
  },
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true, index: true },
  quantity: { type: Number, required: true },
  type: { type: String, enum: ['IN', 'OUT'], required: true, index: true },
  user: { type: String, required: true, default: 'System' }, // Person who performed the action
  date: { type: String, required: true, index: true }, // YYYY-MM-DD local format
  time: { type: String, required: true },
  stockBefore: { type: Number },
  stockAfter: { type: Number },
  idempotencyKey: { type: String, sparse: true, index: true },
  transactionDate: { type: Date, default: Date.now, index: true },
  remarks: { type: String }
}, { timestamps: true });

// Auto-generate human-readable unique transaction ID before validation/saving
transactionSchema.pre('validate', function (next) {
  if (!this.transactionId) {
    const datePrefix = (this.date || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
    const randSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    this.transactionId = `TXN-${datePrefix}-${randSuffix}`;
  }
  next();
});

transactionSchema.index({ item: 1, date: 1 });
transactionSchema.index({ type: 1, date: 1 });
transactionSchema.index({ transactionDate: -1 });

export default mongoose.model('Transaction', transactionSchema);

