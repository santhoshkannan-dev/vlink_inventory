import mongoose from 'mongoose';

const dailyEntrySchema = new mongoose.Schema({
  date: { type: String, required: true }, // Format: DD/MM/YYYY or YYYY-MM-DD
  time: { type: String, required: true }, // Format: HH:MM AM/PM
  careOf: { type: String, required: true }, // Employee / Technician Name
  quality: { type: String, enum: ['GOOD', 'FAULTY'], default: 'GOOD' },
  remarks: { type: String },
  materials: {
    homeNode: { type: Number, default: 0 },
    patchCode: { type: Number, default: 0 },
    tieWire: { type: Number, default: 0 },
    plc1x4: { type: Number, default: 0 },
    plc1x8: { type: Number, default: 0 },
    stb: { type: Number, default: 0 },
    modem: { type: Number, default: 0 },
    cable: { type: Number, default: 0 } // Represented in meters
  },
  idempotencyKey: { type: String, sparse: true, index: true }
}, { timestamps: true });

export default mongoose.model('DailyEntry', dailyEntrySchema);
