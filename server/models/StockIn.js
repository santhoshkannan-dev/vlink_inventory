import mongoose from 'mongoose';

const StockInSchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inventory',
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  supplier: {
    type: String,
    required: true
  },
  invoice: {
    type: String
  },
  receivedBy: {
    type: String,
    required: true
  },
  date: {
    type: String,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  remarks: {
    type: String
  }
}, { timestamps: true });

export default mongoose.model('StockIn', StockInSchema);
