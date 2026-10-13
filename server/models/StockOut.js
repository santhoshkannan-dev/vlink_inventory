import mongoose from 'mongoose';

const StockOutSchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inventory',
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  employee: {
    type: String,
    required: true
  },
  careOf: {
    type: String,
    required: true
  },
  purpose: {
    type: String
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

export default mongoose.model('StockOut', StockOutSchema);
