import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema({
  itemName: { type: String, required: true, unique: true },
  category: { type: String, required: true, index: true },
  sku: { type: String, index: true },
  unit: { type: String, required: true, default: 'Nos' }, // Nos, Meter, Roll, etc.
  currentStock: { 
    type: Number, 
    required: true, 
    default: 0, 
    min: [0, 'Current stock level cannot be negative'], 
    index: true 
  },
  minimumStock: { 
    type: Number, 
    required: true, 
    default: 10,
    min: [0, 'Minimum stock threshold cannot be negative']
  },
  isArchived: { type: Boolean, default: false, index: true },
  archivedAt: { type: Date },
  description: { type: String }
}, { timestamps: true });

// Auto-generate SKU if not provided
inventorySchema.pre('save', function (next) {
  if (!this.sku && this.category && this.itemName) {
    const catCode = this.category.substring(0, 3).toUpperCase();
    const itemCode = this.itemName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase();
    this.sku = `SKU-${catCode}-${itemCode}`;
  }
  next();
});

export default mongoose.model('Inventory', inventorySchema);

