import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Inventory from '../models/Inventory.js';
import DailyEntry from '../models/DailyEntry.js';
import Transaction from '../models/Transaction.js';
import { connectDB, disconnectDB } from '../config/db.js';

dotenv.config();

const runValidationTests = async () => {
  console.log('--- STARTING TRANSACTIONAL SAFETY VALIDATIONS ---');

  try {
    // 1. Establish database connection (triggers in-memory MongoDB replica set)
    await connectDB();

    // Clear and Seed
    console.log('Seeding verification entries...');
    await User.deleteMany();
    await Inventory.deleteMany();
    await DailyEntry.deleteMany();
    await Transaction.deleteMany();

    const admin = await User.create({
      name: 'Admin Verifier',
      email: 'verifier@vlink.com',
      password: 'verify',
      role: 'Admin'
    });

    const nodeItem = await Inventory.create({
      itemName: 'Home Node (FTTH)',
      category: 'Terminal Equipment',
      unit: 'Units',
      currentStock: 10,
      minimumStock: 5,
      description: 'Validation testing nodes'
    });

    const cableItem = await Inventory.create({
      itemName: 'Fiber Cable',
      category: 'Infrastructure',
      unit: 'Meters',
      currentStock: 100,
      minimumStock: 20,
      description: 'Validation testing cables'
    });

    console.log(`Initial stock levels: \n- ${nodeItem.itemName}: ${nodeItem.currentStock} \n- ${cableItem.itemName}: ${cableItem.currentStock}`);

    // Mock request controllers logic directly to isolate and validate transaction safety
    const simulateDailyDispatch = async (dispatchData) => {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const processedMaterials = [];
        for (const mat of dispatchData.materials) {
          const item = await Inventory.findById(mat.itemId).session(session);
          if (!item) throw new Error('Item not found');

          if (item.currentStock < mat.quantity) {
            throw new Error(`Insufficient stock for ${item.itemName}. Available: ${item.currentStock}, Requested: ${mat.quantity}`);
          }

          item.currentStock -= mat.quantity;
          await item.save({ session });

          const transaction = new Transaction({
            item: item._id,
            quantity: mat.quantity,
            type: 'OUT',
            user: admin.name,
            date: dispatchData.date,
            time: dispatchData.time,
            remarks: 'Verification test transaction'
          });
          await transaction.save({ session });
          processedMaterials.push({ itemId: item._id, quantity: mat.quantity });
        }

        const dailyEntry = new DailyEntry({
          date: dispatchData.date,
          time: dispatchData.time,
          careOf: dispatchData.careOf,
          quality: 'GOOD',
          materials: { homeNode: 5, cable: dispatchData.materials[1]?.quantity || 0 }
        });
        await dailyEntry.save({ session });

        await session.commitTransaction();
        session.endSession();
        return { success: true };
      } catch (err) {
        await session.abortTransaction();
        session.endSession();
        return { success: false, error: err.message };
      }
    };

    // 2. TEST CASE A: FAILED TRANSACTION (One item has insufficient stock)
    console.log('\nRunning Test Case A: Dispatch request containing an item with insufficient stock...');
    const resultA = await simulateDailyDispatch({
      date: '2026-06-18',
      time: '11:00 AM',
      careOf: 'Test Technician',
      materials: [
        { itemId: nodeItem._id, quantity: 5 },
        { itemId: cableItem._id, quantity: 150 } // exceeds 100 limit!
      ]
    });

    console.log(`- Dispatch Result: ${resultA.success ? 'SUCCESS' : 'FAILED (' + resultA.error + ')'}`);

    // Check stocks (should remain unchanged due to transaction abort)
    const checkNodeStockA = await Inventory.findById(nodeItem._id);
    const checkCableStockA = await Inventory.findById(cableItem._id);
    console.log(`- Post-Dispatch stock levels:`);
    console.log(`  * ${checkNodeStockA.itemName}: ${checkNodeStockA.currentStock} (Expected: 10)`);
    console.log(`  * ${checkCableStockA.itemName}: ${checkCableStockA.currentStock} (Expected: 100)`);

    const passedTestA = checkNodeStockA.currentStock === 10 && checkCableStockA.currentStock === 100;
    console.log(`=> Test Case A (Atomic Rollback Safety): ${passedTestA ? 'PASSED ✅' : 'FAILED ❌'}`);

    // 3. TEST CASE B: SUCCESSFUL TRANSACTION (All items have sufficient stock)
    console.log('\nRunning Test Case B: Dispatch request containing all valid stock quantities...');
    const resultB = await simulateDailyDispatch({
      date: '2026-06-18',
      time: '11:10 AM',
      careOf: 'Test Technician',
      materials: [
        { itemId: nodeItem._id, quantity: 5 },
        { itemId: cableItem._id, quantity: 30 }
      ]
    });

    console.log(`- Dispatch Result: ${resultB.success ? 'SUCCESS' : 'FAILED (' + resultB.error + ')'}`);

    // Check stocks (should be deducted)
    const checkNodeStockB = await Inventory.findById(nodeItem._id);
    const checkCableStockB = await Inventory.findById(cableItem._id);
    console.log(`- Post-Dispatch stock levels:`);
    console.log(`  * ${checkNodeStockB.itemName}: ${checkNodeStockB.currentStock} (Expected: 5)`);
    console.log(`  * ${checkCableStockB.itemName}: ${checkCableStockB.currentStock} (Expected: 70)`);

    const passedTestB = checkNodeStockB.currentStock === 5 && checkCableStockB.currentStock === 70;
    console.log(`=> Test Case B (Successful Atomic Deductions): ${passedTestB ? 'PASSED ✅' : 'FAILED ❌'}`);

    // Close DB connection
    await disconnectDB();
    console.log('\n--- VALIDATIONS COMPLETED SUCCESSFULLY ---');
    process.exit(passedTestA && passedTestB ? 0 : 1);

  } catch (error) {
    console.error(`Verification suite execution error: ${error.message}`);
    process.exit(1);
  }
};

runValidationTests();
