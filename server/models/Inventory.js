import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema({
  itemName: { type: String, required: true, unique: true },
  category: { type: String, required: true, index: true },
  unit: { type: String, required: true, default: 'Nos' }, // Nos, Meter, Roll, etc.
  currentStock: { type: Number, required: true, default: 0, index: true },
  minimumStock: { type: Number, required: true, default: 10 },
  description: { type: String }
}, { timestamps: true });

export default mongoose.model('Inventory', inventorySchema);
