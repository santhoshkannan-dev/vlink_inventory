import Inventory from '../models/Inventory.js';
import Transaction from '../models/Transaction.js';
import { getLocalDateString, getLocalTimeString } from '../utils/dateUtils.js';

// Get all inventory items with status calculations (Reference image_2.png)
export const getInventory = async (req, res) => {
  try {
    const filter = {};
    if (req.query.includeArchived !== 'true') {
      filter.isArchived = { $ne: true };
    }

    const items = await Inventory.find(filter).sort({ itemName: 1 });
    
    // Dynamically flag thresholds on retrieval
    const processedItems = items.map(item => {
      let status = 'HEALTHY';
      if (item.currentStock <= 0) {
        status = 'OUT OF STOCK';
      } else if (item.currentStock <= item.minimumStock) {
        status = 'CRITICAL';
      }
      return { ...item._doc, status };
    });

    res.status(200).json({ success: true, data: processedItems });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Handle Stock In (Increment stock + generate transactional audit log)
export const processStockIn = async (req, res) => {
  try {
    const { itemId, quantity, supplier, invoice, receivedBy, date, time, remarks, idempotencyKey: bodyKey } = req.body;
    const idempotencyKey = req.headers['x-idempotency-key'] || bodyKey;

    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      return res.status(400).json({ success: false, message: 'Stock-in quantity must be a positive number greater than 0.' });
    }

    // Check duplicate submission via idempotency key
    if (idempotencyKey) {
      const existingTx = await Transaction.findOne({ idempotencyKey }).populate('item');
      if (existingTx) {
        return res.status(200).json({
          success: true,
          message: 'Stock-in operation already processed (duplicate request prevented).',
          data: existingTx.item,
          transaction: existingTx,
          duplicate: true
        });
      }
    }

    // Increment current stock atomically
    const updatedItem = await Inventory.findByIdAndUpdate(
      itemId,
      { $inc: { currentStock: qty } },
      { new: true }
    );

    if (!updatedItem) {
      return res.status(404).json({ success: false, message: 'Inventory item not found.' });
    }

    const stockBefore = updatedItem.currentStock - qty;
    const stockAfter = updatedItem.currentStock;
    const txDate = date || getLocalDateString();
    const txTime = time || getLocalTimeString();

    // Write to unalterable transaction ledger with before/after tracking
    let tx;
    try {
      tx = await Transaction.create({
        item: itemId,
        quantity: qty,
        type: 'IN',
        stockBefore,
        stockAfter,
        idempotencyKey,
        user: receivedBy || req.user?.name || 'System',
        date: txDate,
        time: txTime,
        remarks: `Vendor: ${supplier || 'N/A'} | Inv: ${invoice || 'N/A'} | ${remarks || ''}`
      });
    } catch (txErr) {
      // Revert atomic stock increment to guarantee consistency if transaction record write fails
      await Inventory.findByIdAndUpdate(itemId, { $inc: { currentStock: -qty } });
      throw txErr;
    }

    res.status(200).json({
      success: true,
      message: `${qty} ${updatedItem.unit} added to ${updatedItem.itemName} successfully.`,
      data: updatedItem,
      transaction: tx
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Handle Stock Out (Decrement stock + generate transactional audit log)
export const processStockOut = async (req, res) => {
  try {
    const { itemId, quantity, employee, careOf, purpose, date, time, remarks, idempotencyKey: bodyKey } = req.body;
    const idempotencyKey = req.headers['x-idempotency-key'] || bodyKey;

    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      return res.status(400).json({ success: false, message: 'Stock-out quantity must be a positive number greater than 0.' });
    }

    // Check duplicate submission via idempotency key
    if (idempotencyKey) {
      const existingTx = await Transaction.findOne({ idempotencyKey }).populate('item');
      if (existingTx) {
        return res.status(200).json({
          success: true,
          message: 'Stock-out operation already processed (duplicate request prevented).',
          data: existingTx.item,
          transaction: existingTx,
          duplicate: true
        });
      }
    }

    // Decrement current stock atomically only if stock >= qty (strictly prevents negative stock)
    const updatedItem = await Inventory.findOneAndUpdate(
      { _id: itemId, currentStock: { $gte: qty } },
      { $inc: { currentStock: -qty } },
      { new: true }
    );

    if (!updatedItem) {
      const existing = await Inventory.findById(itemId);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Inventory item not found.' });
      }
      return res.status(400).json({
        success: false,
        message: `Insufficient stock for ${existing.itemName}. Available: ${existing.currentStock} ${existing.unit}, Requested: ${qty} ${existing.unit}.`
      });
    }

    const stockBefore = updatedItem.currentStock + qty;
    const stockAfter = updatedItem.currentStock;
    const txDate = date || getLocalDateString();
    const txTime = time || getLocalTimeString();

    // Write to unalterable transaction ledger with before/after tracking
    let tx;
    try {
      tx = await Transaction.create({
        item: itemId,
        quantity: qty,
        type: 'OUT',
        stockBefore,
        stockAfter,
        idempotencyKey,
        user: employee || careOf || req.user?.name || 'System',
        date: txDate,
        time: txTime,
        remarks: `Purpose: ${purpose || 'General Dispatch'} | ${remarks || ''}`
      });
    } catch (txErr) {
      // Revert atomic stock decrement to guarantee consistency if transaction record write fails
      await Inventory.findByIdAndUpdate(itemId, { $inc: { currentStock: qty } });
      throw txErr;
    }

    res.status(200).json({
      success: true,
      message: `${qty} ${updatedItem.unit} issued from ${updatedItem.itemName} successfully.`,
      data: updatedItem,
      transaction: tx
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get low stock alerts (flat array for header notifications)
export const getAlerts = async (req, res) => {
  try {
    const items = await Inventory.find({ isArchived: { $ne: true } });
    const alerts = items.filter(item => item.currentStock <= item.minimumStock);
    res.status(200).json(alerts);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create a new inventory item
export const createInventoryItem = async (req, res) => {
  try {
    const { itemName, category, unit, currentStock, minimumStock, description } = req.body;

    const existing = await Inventory.findOne({ itemName });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Item name already exists.' });
    }

    const initialStock = Number(currentStock) || 0;
    const minStock = Number(minimumStock) || 0;

    if (initialStock < 0 || minStock < 0) {
      return res.status(400).json({ success: false, message: 'Stock numbers cannot be negative.' });
    }

    const newItem = await Inventory.create({
      itemName,
      category,
      unit: unit || 'Nos',
      currentStock: initialStock,
      minimumStock: minStock,
      description
    });

    // Write a system-level transaction log for initial intake auditing
    if (initialStock > 0) {
      await Transaction.create({
        item: newItem._id,
        quantity: initialStock,
        type: 'IN',
        stockBefore: 0,
        stockAfter: initialStock,
        user: req.user?.name || 'System',
        date: getLocalDateString(),
        time: getLocalTimeString(),
        remarks: 'Initial catalog intake'
      });
    }

    res.status(201).json({ success: true, data: newItem });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update an existing inventory item
export const updateInventoryItem = async (req, res) => {
  try {
    const { itemName, category, unit, currentStock, minimumStock, description } = req.body;
    const { id } = req.params;

    const existingItem = await Inventory.findById(id);
    if (!existingItem) {
      return res.status(404).json({ success: false, message: 'Inventory item not found.' });
    }

    const newStock = Number(currentStock);
    const newMin = Number(minimumStock);

    if (newStock < 0 || newMin < 0) {
      return res.status(400).json({ success: false, message: 'Stock levels cannot be negative.' });
    }

    const stockDiff = newStock - existingItem.currentStock;
    const stockBefore = existingItem.currentStock;

    existingItem.itemName = itemName || existingItem.itemName;
    existingItem.category = category || existingItem.category;
    existingItem.unit = unit || existingItem.unit;
    existingItem.currentStock = newStock;
    existingItem.minimumStock = newMin;
    if (description !== undefined) existingItem.description = description;

    await existingItem.save();

    // If stock level was manually adjusted by Admin, log an audit transaction
    if (stockDiff !== 0) {
      await Transaction.create({
        item: existingItem._id,
        quantity: Math.abs(stockDiff),
        type: stockDiff > 0 ? 'IN' : 'OUT',
        stockBefore,
        stockAfter: newStock,
        user: req.user?.name || 'Administrator',
        date: getLocalDateString(),
        time: getLocalTimeString(),
        remarks: `Manual stock level adjustment by Admin (${stockDiff > 0 ? '+' : ''}${stockDiff} ${existingItem.unit})`
      });
    }

    res.status(200).json({ success: true, data: existingItem });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete or Archive an inventory item (Preserves historical transactions)
export const deleteInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await Inventory.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Inventory item not found.' });
    }

    // Check if historical transactions exist for this item
    const hasTransactions = await Transaction.exists({ item: id });

    if (hasTransactions) {
      // Archive item to preserve historical audit trail & report integrity
      item.isArchived = true;
      item.archivedAt = new Date();
      await item.save();
      return res.status(200).json({ 
        success: true, 
        message: 'Item has historical stock movements and has been safely archived to preserve the audit trail.',
        archived: true
      });
    }

    // If no transactions exist, safe to permanently delete
    await Inventory.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Inventory item deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Bulk delete or archive inventory items
export const deleteBatchInventoryItems = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide an array of item IDs to delete.' });
    }

    let archivedCount = 0;
    let deletedCount = 0;

    for (const id of ids) {
      const item = await Inventory.findById(id);
      if (!item) continue;

      const hasTransactions = await Transaction.exists({ item: id });
      if (hasTransactions) {
        item.isArchived = true;
        item.archivedAt = new Date();
        await item.save();
        archivedCount++;
      } else {
        await Inventory.findByIdAndDelete(id);
        deletedCount++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Processed ${ids.length} item(s): ${deletedCount} deleted, ${archivedCount} archived to preserve audit history.`,
      deletedCount,
      archivedCount
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
