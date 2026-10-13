import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { connectDB, disconnectDB } from '../config/db.js';
import User from '../models/User.js';
import Inventory from '../models/Inventory.js';
import Transaction from '../models/Transaction.js';
import DailyEntry from '../models/DailyEntry.js';
import {
  processStockIn,
  processStockOut,
  deleteInventoryItem,
  deleteBatchInventoryItems,
  getInventory
} from '../controllers/inventoryController.js';
import { createDailyEntry } from '../controllers/dailyEntryController.js';
import { getTransactions } from '../controllers/transactionController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

// Mock express response object
const createMockRes = () => {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
};

const runPhase1AuditTests = async () => {
  console.log('================================================================');
  console.log('PHASE 1: INVENTORY ACCURACY AND STOCK AUDIT TEST SUITE');
  console.log('================================================================\n');

  await connectDB();

  let passed = 0;
  let failed = 0;

  const assert = (condition, desc) => {
    if (condition) {
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${desc}`);
      failed++;
    }
  };

  try {
    const timestamp = Date.now();

    // -------------------------------------------------------------
    // SETUP TEST USERS
    // -------------------------------------------------------------
    console.log('--- 0. Setting up Test Users & Tokens ---');
    let adminUser = await User.findOne({ email: 'admin_test@vlink.com' });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'Admin Auditor',
        email: 'admin_test@vlink.com',
        password: 'password123',
        role: 'Admin'
      });
    }

    let staffUser = await User.findOne({ email: 'staff_test@vlink.com' });
    if (!staffUser) {
      staffUser = await User.create({
        name: 'Staff Auditor',
        email: 'staff_test@vlink.com',
        password: 'password123',
        role: 'Staff'
      });
    }

    const jwtSecret = process.env.JWT_SECRET || 'vlink_jwt_secret_123456';
    const adminToken = jwt.sign({ id: adminUser._id }, jwtSecret, { expiresIn: '1h' });
    const staffToken = jwt.sign({ id: staffUser._id }, jwtSecret, { expiresIn: '1h' });

    assert(adminUser && staffUser, 'Admin and Staff test users verified');

    // -------------------------------------------------------------
    // TEST 1: INSUFFICIENT STOCK PREVENTION (NO NEGATIVE INVENTORY)
    // -------------------------------------------------------------
    console.log('\n--- 1. Testing Insufficient Stock Prevention ---');
    const testItem1 = await Inventory.create({
      itemName: `Audit Router ${timestamp}`,
      category: 'Terminal Equipment',
      unit: 'Units',
      currentStock: 5,
      minimumStock: 2,
      description: 'Test router for negative stock prevention'
    });

    const mockReqExcessive = {
      body: {
        itemId: testItem1._id,
        quantity: 10, // Available is only 5
        employee: 'Santhosh Kannan',
        purpose: 'Client installation'
      },
      headers: {},
      user: staffUser
    };
    const mockResExcessive = createMockRes();

    await processStockOut(mockReqExcessive, mockResExcessive);

    assert(mockResExcessive.statusCode === 400, 'Rejects stock-out when requested quantity exceeds available stock (HTTP 400)');
    assert(mockResExcessive.body?.success === false, 'Returns success: false for excessive withdrawal');

    const itemAfterFailedOut = await Inventory.findById(testItem1._id);
    assert(itemAfterFailedOut.currentStock === 5, 'Inventory quantity remains untouched at 5');

    // Schema level validation test: direct save with negative stock
    let schemaValidationThrew = false;
    try {
      await Inventory.create({
        itemName: `Invalid Negative Item ${timestamp}`,
        category: 'Hardware',
        unit: 'Units',
        currentStock: -10,
        minimumStock: 0
      });
  
    // -------------------------------------------------------------
    // TEST 9: BATCH SELECT ALL & DELETE
    // -------------------------------------------------------------
    console.log('\n--- 9. Testing Batch Delete Endpoint ---');
    const batchItem1 = await Inventory.create({
      itemName: `Batch Item 1 ${timestamp}`,
      category: 'Infrastructure',
      unit: 'Nos',
      currentStock: 10,
      minimumStock: 2
    });
    // Create transaction for batchItem1 so it archives
    await Transaction.create({
      item: batchItem1._id,
      quantity: 10,
      type: 'IN',
      user: 'Administrator',
      date: '2026-10-13',
      time: '12:00:00',
      remarks: 'Batch test stock in'
    });

    const batchItem2 = await Inventory.create({
      itemName: `Batch Item 2 ${timestamp}`,
      category: 'Connectivity',
      unit: 'Nos',
      currentStock: 0,
      minimumStock: 0
    }); // No transactions, so it permanently deletes

    const batchReq = {
      body: { ids: [batchItem1._id.toString(), batchItem2._id.toString()] },
      user: adminUser
    };
    const batchRes = createMockRes();
    await deleteBatchInventoryItems(batchReq, batchRes);

    assert(batchRes.statusCode === 200, 'Batch delete responded HTTP 200');
    assert(batchRes.body.archivedCount === 1, 'Correctly archived item with history');
    assert(batchRes.body.deletedCount === 1, 'Correctly permanently deleted item without history');

    const checkArchived = await Inventory.findById(batchItem1._id);
    assert(checkArchived && checkArchived.isArchived === true, 'Batch archived item preserved in database');
    const checkDeleted = await Inventory.findById(batchItem2._id);
    assert(checkDeleted === null, 'Batch deleted item removed from database');

  } catch (err) {
      schemaValidationThrew = true;
    }
    assert(schemaValidationThrew, 'Mongoose Schema strictly rejects negative currentStock via min: 0 validator');

    // -------------------------------------------------------------
    // TEST 2: CONCURRENT STOCK-OUTS (RACE CONDITION SAFETY)
    // -------------------------------------------------------------
    console.log('\n--- 2. Testing Concurrent Stock-Outs (Atomic Decrement Race Safety) ---');
    const testItem2 = await Inventory.create({
      itemName: `Audit Fiber Switch ${timestamp}`,
      category: 'Infrastructure',
      unit: 'Units',
      currentStock: 10,
      minimumStock: 2,
      description: 'Concurrency test switch'
    });

    // 5 simultaneous requests attempting to deduct 3 units each (Total 15 requested, only 10 available)
    // Exactly 3 requests must succeed (3 * 3 = 9), and 2 must fail. Final stock MUST be 1.
    const concurrentRequests = Array.from({ length: 5 }, (_, idx) => {
      const req = {
        body: {
          itemId: testItem2._id,
          quantity: 3,
          employee: `Concurrent Worker ${idx + 1}`,
          purpose: 'Concurrent deployment'
        },
        headers: {},
        user: staffUser
      };
      const res = createMockRes();
      return processStockOut(req, res).then(() => res);
    });

    const results = await Promise.all(concurrentRequests);
    const successes = results.filter(r => r.statusCode === 200);
    const rejections = results.filter(r => r.statusCode === 400);

    assert(successes.length === 3, `Exactly 3 concurrent stock-out requests succeeded (got ${successes.length})`);
    assert(rejections.length === 2, `Exactly 2 concurrent stock-out requests were rejected safely (got ${rejections.length})`);

    const itemAfterConcurrent = await Inventory.findById(testItem2._id);
    assert(itemAfterConcurrent.currentStock === 1, `Final stock is exactly 1 (10 - 9 = 1), strictly non-negative (got ${itemAfterConcurrent.currentStock})`);

    const concurrentTxCount = await Transaction.countDocuments({ item: testItem2._id });
    assert(concurrentTxCount === 3, `Ledger records exactly 3 successful transactions matching deducted units`);

    // -------------------------------------------------------------
    // TEST 3: BEFORE-AND-AFTER STOCK TRACKING & TRANSACTION ID
    // -------------------------------------------------------------
    console.log('\n--- 3. Testing Before & After Stock Tracking and Unique Transaction IDs ---');
    const testItem3 = await Inventory.create({
      itemName: `Audit Splice Box ${timestamp}`,
      category: 'Connectivity',
      unit: 'Units',
      currentStock: 20,
      minimumStock: 5,
      description: 'Audit tracking splice box'
    });

    // Stock In 10 units
    const inReq = {
      body: {
        itemId: testItem3._id,
        quantity: 10,
        supplier: 'Apex Telecom',
        invoice: 'INV-AUDIT-001',
        receivedBy: 'Admin Auditor'
      },
      headers: {},
      user: adminUser
    };
    const inRes = createMockRes();
    await processStockIn(inReq, inRes);

    assert(inRes.statusCode === 200, 'Stock In successful (HTTP 200)');
    const inTx = inRes.body.transaction;
    assert(inTx.stockBefore === 20, `Stock In records correct stockBefore: 20 (got ${inTx.stockBefore})`);
    assert(inTx.stockAfter === 30, `Stock In records correct stockAfter: 30 (got ${inTx.stockAfter})`);
    assert(/^TXN-\d{8}-[A-Z0-9]{4,8}$/.test(inTx.transactionId), `Unique Transaction ID format matches TXN-YYYYMMDD-XXXX (got ${inTx.transactionId})`);

    // Stock Out 6 units
    const outReq = {
      body: {
        itemId: testItem3._id,
        quantity: 6,
        employee: 'Field Tech',
        purpose: 'Site Alpha'
      },
      headers: {},
      user: staffUser
    };
    const outRes = createMockRes();
    await processStockOut(outReq, outRes);

    assert(outRes.statusCode === 200, 'Stock Out successful (HTTP 200)');
    const outTx = outRes.body.transaction;
    assert(outTx.stockBefore === 30, `Stock Out records correct stockBefore: 30 (got ${outTx.stockBefore})`);
    assert(outTx.stockAfter === 24, `Stock Out records correct stockAfter: 24 (got ${outTx.stockAfter})`);
    assert(/^TXN-\d{8}-[A-Z0-9]{4,8}$/.test(outTx.transactionId), `Stock Out Transaction ID format valid (got ${outTx.transactionId})`);

    // -------------------------------------------------------------
    // TEST 4: DUPLICATE REQUEST PREVENTION (IDEMPOTENCY)
    // -------------------------------------------------------------
    console.log('\n--- 4. Testing Duplicate Request Prevention (Idempotency Key) ---');
    const idempKeyIn = `idemp-in-${timestamp}`;
    const idempReq1 = {
      body: {
        itemId: testItem3._id,
        quantity: 5,
        supplier: 'Fast Net',
        invoice: 'INV-DUP-1',
        receivedBy: 'Admin'
      },
      headers: { 'x-idempotency-key': idempKeyIn },
      user: adminUser
    };
    const idempRes1 = createMockRes();
    await processStockIn(idempReq1, idempRes1);

    const stockAfterFirstIn = (await Inventory.findById(testItem3._id)).currentStock; // 24 + 5 = 29
    assert(stockAfterFirstIn === 29, `First stock-in processed: stock is now ${stockAfterFirstIn}`);

    // Replay the exact same request with the same idempotency key
    const idempRes2 = createMockRes();
    await processStockIn(idempReq1, idempRes2);

    assert(idempRes2.statusCode === 200, 'Replayed stock-in returns HTTP 200');
    assert(idempRes2.body.duplicate === true, 'Response flags duplicate: true');
    const stockAfterSecondIn = (await Inventory.findById(testItem3._id)).currentStock;
    assert(stockAfterSecondIn === 29, `Stock was NOT duplicated: remains 29 (got ${stockAfterSecondIn})`);

    const idempTxCount = await Transaction.countDocuments({ idempotencyKey: idempKeyIn });
    assert(idempTxCount === 1, 'Exactly 1 transaction stored for this idempotency key');

    // -------------------------------------------------------------
    // TEST 5: FAILED TRANSACTION ROLLBACK & CONSISTENCY
    // -------------------------------------------------------------
    console.log('\n--- 5. Testing Multi-Item Dispatch Consistency & Rollback ---');
    // Ensure Cable and Home Node exist
    let cable = await Inventory.findOne({ itemName: 'Cable' });
    if (!cable) {
      cable = await Inventory.create({ itemName: 'Cable', category: 'Infrastructure', unit: 'Meters', currentStock: 50, minimumStock: 10 });
    } else {
      cable.currentStock = 50;
      await cable.save();
    }

    let modem = await Inventory.findOne({ itemName: 'Modem' });
    if (!modem) {
      modem = await Inventory.create({ itemName: 'Modem', category: 'Terminal Equipment', unit: 'Units', currentStock: 2, minimumStock: 1 });
    } else {
      modem.currentStock = 2; // only 2 available
      await modem.save();
    }

    // Daily entry requesting 10 Cable (has 50) and 10 Modem (only has 2) -> must fail and neither should be deducted
    const dispatchReq = {
      body: {
        careOf: 'Kannan',
        quality: 'GOOD',
        materials: {
          cable: 10,
          modem: 10 // Insufficient!
        }
      },
      headers: {},
      user: staffUser
    };
    const dispatchRes = createMockRes();
    await createDailyEntry(dispatchReq, dispatchRes);

    assert(dispatchRes.statusCode === 400, 'Daily Entry dispatch rejected due to insufficient stock on one item (HTTP 400)');
    const cableAfterFailed = await Inventory.findById(cable._id);
    const modemAfterFailed = await Inventory.findById(modem._id);
    assert(cableAfterFailed.currentStock === 50, 'Cable stock remains untouched at 50 (atomic rollback)');
    assert(modemAfterFailed.currentStock === 2, 'Modem stock remains untouched at 2');

    // -------------------------------------------------------------
    // TEST 6: ARCHIVE VS DELETE (PRESERVES HISTORICAL TRANSACTIONS)
    // -------------------------------------------------------------
    console.log('\n--- 6. Testing Historical Preservation & Soft-Archiving ---');
    const itemToArchive = await Inventory.create({
      itemName: `Archive Legacy Hardware ${timestamp}`,
      category: 'Infrastructure',
      unit: 'Nos',
      currentStock: 15,
      minimumStock: 3
    });

    // Create a transaction for it
    await Transaction.create({
      item: itemToArchive._id,
      quantity: 15,
      type: 'IN',
      stockBefore: 0,
      stockAfter: 15,
      user: 'Administrator',
      date: '2026-10-13',
      time: '12:00:00',
      remarks: 'Initial hardware delivery'
    });

    const delReq = { params: { id: itemToArchive._id.toString() }, user: adminUser };
    const delRes = createMockRes();
    await deleteInventoryItem(delReq, delRes);

    assert(delRes.statusCode === 200, 'Delete request responded HTTP 200');
    assert(delRes.body.archived === true, 'Item with transaction history is soft-archived rather than permanently deleted');

    const checkArchivedInDb = await Inventory.findById(itemToArchive._id);
    assert(checkArchivedInDb !== null, 'Item document still exists in database');
    assert(checkArchivedInDb.isArchived === true, 'Item has isArchived: true');

    const txCheck = await Transaction.findOne({ item: itemToArchive._id }).populate('item');
    assert(txCheck !== null && txCheck.item !== null, 'Historical transaction remains intact with populated item data');

    // Active catalog query excludes archived item
    const getCatalogReq = { query: {}, user: adminUser };
    const getCatalogRes = createMockRes();
    await getInventory(getCatalogReq, getCatalogRes);
    const activeItems = getCatalogRes.body.data;
    const foundArchived = activeItems.find(i => i._id.toString() === itemToArchive._id.toString());
    assert(!foundArchived, 'Default inventory catalog query cleanly excludes archived item');

    // -------------------------------------------------------------
    // TEST 7: AUTHORIZATION & ROLE ACCESS CONTROLS
    // -------------------------------------------------------------
    console.log('\n--- 7. Testing Role-Based Backend Access Controls ---');
    // Admin route: Stock In
    const adminOnlyMiddleware = authorize('Admin');
    let staffDenied = false;
    const mockStaffReq = { user: { role: 'Staff' } };
    const mockStaffRes = createMockRes();
    adminOnlyMiddleware(mockStaffReq, mockStaffRes, () => {
      staffDenied = false;
    });
    if (mockStaffRes.statusCode === 403) staffDenied = true;
    assert(staffDenied, 'Staff user is blocked from Admin-only endpoints (HTTP 403 Forbidden)');

    let adminAllowed = false;
    const mockAdminReq = { user: { role: 'Admin' } };
    const mockAdminRes = createMockRes();
    adminOnlyMiddleware(mockAdminReq, mockAdminRes, () => {
      adminAllowed = true;
    });
    assert(adminAllowed, 'Admin user is permitted on Admin-only endpoints');

    // Unauthenticated request
    let unauthBlocked = false;
    const unauthReq = { headers: {} };
    const unauthRes = createMockRes();
    await protect(unauthReq, unauthRes, () => {});
    if (unauthRes.statusCode === 401) unauthBlocked = true;
    assert(unauthBlocked, 'Requests without Bearer token are blocked with HTTP 401 Unauthorized');

    // -------------------------------------------------------------
    // TEST 8: STOCK MOVEMENT HISTORY & FILTERS
    // -------------------------------------------------------------
    console.log('\n--- 8. Testing Stock Movement History Filter Endpoints ---');
    const filterItemReq = {
      query: { itemId: testItem3._id.toString() },
      user: adminUser
    };
    const filterItemRes = createMockRes();
    await getTransactions(filterItemReq, filterItemRes);

    assert(filterItemRes.statusCode === 200, 'Transactions query endpoint returns HTTP 200');
    assert(filterItemRes.body.success === true, 'Transactions query success: true');
    assert(filterItemRes.body.data.length > 0, `Returns matching transactions for item (count: ${filterItemRes.body.data.length})`);
    assert(filterItemRes.body.metrics?.totalMovements > 0, 'Returns aggregated movement metrics');

    // Filter by type 'IN'
    const filterInReq = {
      query: { itemId: testItem3._id.toString(), type: 'IN' },
      user: adminUser
    };
    const filterInRes = createMockRes();
    await getTransactions(filterInReq, filterInRes);
    const allIn = filterInRes.body.data.every(t => t.type === 'IN');
    assert(allIn, 'Type filter correctly restricts results exclusively to IN movements');


    // -------------------------------------------------------------
    // TEST 9: BATCH SELECT ALL & DELETE
    // -------------------------------------------------------------
    console.log('\n--- 9. Testing Batch Delete Endpoint ---');
    const batchItem1 = await Inventory.create({
      itemName: `Batch Item 1 ${timestamp}`,
      category: 'Infrastructure',
      unit: 'Nos',
      currentStock: 10,
      minimumStock: 2
    });
    // Create transaction for batchItem1 so it archives
    await Transaction.create({
      item: batchItem1._id,
      quantity: 10,
      type: 'IN',
      user: 'Administrator',
      date: '2026-10-13',
      time: '12:00:00',
      remarks: 'Batch test stock in'
    });

    const batchItem2 = await Inventory.create({
      itemName: `Batch Item 2 ${timestamp}`,
      category: 'Connectivity',
      unit: 'Nos',
      currentStock: 0,
      minimumStock: 0
    }); // No transactions, so it permanently deletes

    const batchReq = {
      body: { ids: [batchItem1._id.toString(), batchItem2._id.toString()] },
      user: adminUser
    };
    const batchRes = createMockRes();
    await deleteBatchInventoryItems(batchReq, batchRes);

    assert(batchRes.statusCode === 200, 'Batch delete responded HTTP 200');
    assert(batchRes.body.archivedCount === 1, 'Correctly archived item with history');
    assert(batchRes.body.deletedCount === 1, 'Correctly permanently deleted item without history');

    const checkArchived = await Inventory.findById(batchItem1._id);
    assert(checkArchived && checkArchived.isArchived === true, 'Batch archived item preserved in database');
    const checkDeleted = await Inventory.findById(batchItem2._id);
    assert(checkDeleted === null, 'Batch deleted item removed from database');

  } catch (err) {
    console.error('Fatal error in test suite:', err);
    failed++;
  } finally {
    console.log('\n================================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    await disconnectDB();

    if (failed > 0) {
      process.exit(1);
    }
  }
};

runPhase1AuditTests();
