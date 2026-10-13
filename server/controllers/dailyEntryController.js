import DailyEntry from '../models/DailyEntry.js';
import Inventory from '../models/Inventory.js';
import Transaction from '../models/Transaction.js';
import { getLocalDateString, getLocalTimeString } from '../utils/dateUtils.js';

export const createDailyEntry = async (req, res) => {
  try {
    const { date, time, careOf, quality, remarks, materials } = req.body;

    if (!materials || typeof materials !== 'object') {
      return res.status(400).json({ success: false, message: 'Materials object is required.' });
    }

    // 1. Map frontend object keys to actual DB inventory names
    const materialMapping = {
      homeNode: 'Home Node',
      patchCode: 'Patch Code',
      tieWire: 'Tie Wire',
      plc1x4: 'PLC 1×4',
      plc1x8: 'PLC 1×8',
      stb: 'STB',
      modem: 'Modem',
      cable: 'Cable'
    };

    const entryDate = date || getLocalDateString();
    const entryTime = time || getLocalTimeString();

    // 2. Validate stock availability for all materials BEFORE committing any deductions
    const validatedDeductions = [];

    for (const [key, qty] of Object.entries(materials)) {
      const numericQty = Number(qty);
      if (numericQty < 0) {
        return res.status(400).json({ success: false, message: `Invalid negative quantity for ${key}.` });
      }

      if (numericQty > 0) {
        const dbItemName = materialMapping[key];
        if (!dbItemName) continue;

        const item = await Inventory.findOne({ itemName: dbItemName });
        if (!item) {
          return res.status(404).json({
            success: false,
            message: `Material "${dbItemName}" was not found in the inventory system.`
          });
        }

        if (item.currentStock < numericQty) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${dbItemName}. Available: ${item.currentStock} ${item.unit}, Requested: ${numericQty} ${item.unit}.`
          });
        }

        validatedDeductions.push({
          itemId: item._id,
          itemName: dbItemName,
          quantity: numericQty,
          unit: item.unit
        });
      }
    }

    if (validatedDeductions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No material quantities greater than 0 were specified.'
      });
    }

    // 3. Atomically decrement stock and create transactions
    for (const deduction of validatedDeductions) {
      const updatedItem = await Inventory.findOneAndUpdate(
        { _id: deduction.itemId, currentStock: { $gte: deduction.quantity } },
        { $inc: { currentStock: -deduction.quantity } },
        { new: true }
      );

      if (!updatedItem) {
        return res.status(400).json({
          success: false,
          message: `Stock level conflict for ${deduction.itemName}. Please refresh and retry.`
        });
      }

      // Generate audit transaction log
      await Transaction.create({
        item: updatedItem._id,
        quantity: deduction.quantity,
        type: 'OUT',
        user: careOf || req.user?.name || 'Technician',
        date: entryDate,
        time: entryTime,
        remarks: `Daily Entry dispatch. Quality status: ${quality || 'GOOD'} | ${remarks || ''}`
      });
    }

    // 4. Save the Daily Entry Log
    const newEntry = new DailyEntry({
      date: entryDate,
      time: entryTime,
      careOf,
      quality: quality || 'GOOD',
      remarks,
      materials
    });

    await newEntry.save();

    res.status(201).json({ 
      success: true, 
      message: 'Daily Entry processed, stock levels updated automatically.',
      data: newEntry 
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process dispatch log entry.', 
      error: error.message 
    });
  }
};
