import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true, index: true },
  quantity: { type: Number, required: true },
  type: { type: String, enum: ['IN', 'OUT'], required: true, index: true },
  user: { type: String, required: true, default: 'System' }, // Person who performed the action
  date: { type: String, required: true, index: true }, // YYYY-MM-DD local format
  time: { type: String, required: true },
  transactionDate: { type: Date, default: Date.now, index: true },
  remarks: { type: String }
}, { timestamps: true });

transactionSchema.index({ item: 1, date: 1 });
transactionSchema.index({ type: 1, date: 1 });

export default mongoose.model('Transaction', transactionSchema);
