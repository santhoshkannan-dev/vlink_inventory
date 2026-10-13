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
    const idempotencyKey = req.headers['x-idempotency-key'] || req.body.idempotencyKey;

    // Prevent duplicate submission on network retries
    if (idempotencyKey) {
      const existing = await DailyEntry.findOne({ idempotencyKey });
      if (existing) {
        return res.status(200).json({
          success: true,
          message: 'Daily Entry already processed (duplicate submission prevented).',
          data: existing,
          duplicate: true
        });
      }
    }

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

        const item = await Inventory.findOne({ itemName: dbItemName, isArchived: { $ne: true } });
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

    // 3. Atomically decrement stock and create transactions with all-or-nothing rollback consistency
    const successfullyProcessed = [];

    try {
      for (const deduction of validatedDeductions) {
        const updatedItem = await Inventory.findOneAndUpdate(
          { _id: deduction.itemId, currentStock: { $gte: deduction.quantity } },
          { $inc: { currentStock: -deduction.quantity } },
          { new: true }
        );

        if (!updatedItem) {
          throw new Error(`Stock level conflict for ${deduction.itemName}. Insufficient stock during concurrent request.`);
        }

        const stockBefore = updatedItem.currentStock + deduction.quantity;
        const stockAfter = updatedItem.currentStock;

        // Generate audit transaction log with before/after tracking
        const tx = await Transaction.create({
          item: updatedItem._id,
          quantity: deduction.quantity,
          type: 'OUT',
          stockBefore,
          stockAfter,
          user: careOf || req.user?.name || 'Technician',
          date: entryDate,
          time: entryTime,
          remarks: `Daily Entry dispatch. Quality status: ${quality || 'GOOD'} | ${remarks || ''}`
        });

        successfullyProcessed.push({
          itemId: deduction.itemId,
          quantity: deduction.quantity,
          txId: tx._id
        });
      }

      // 4. Save the Daily Entry Log
      const newEntry = new DailyEntry({
        date: entryDate,
        time: entryTime,
        careOf,
        quality: quality || 'GOOD',
        remarks,
        materials,
        idempotencyKey
      });

      await newEntry.save();

      return res.status(201).json({ 
        success: true, 
        message: 'Daily Entry processed, stock levels updated automatically.',
        data: newEntry 
      });

    } catch (operationErr) {
      // Compensating Rollback: Revert any already-deducted inventory and delete created audit transactions
      for (const item of successfullyProcessed) {
        try {
          await Inventory.findByIdAndUpdate(item.itemId, { $inc: { currentStock: item.quantity } });
          await Transaction.findByIdAndDelete(item.txId);
        } catch (rollbackErr) {
          console.error('Rollback failure for item:', item.itemId, rollbackErr);
        }
      }

      return res.status(400).json({
        success: false,
        message: operationErr.message || 'Stock dispatch conflict. Changes rolled back safely.'
      });
    }

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process dispatch log entry.', 
      error: error.message 
    });
  }
};
