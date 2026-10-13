import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import Inventory from '../models/Inventory.js';
import Transaction from '../models/Transaction.js';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { formatTransactionDateTime, getTransactionTimestamp, getLocalDateString, getLocalTimeString } from '../utils/dateUtils.js';

// Recreate or import aggregation logic to test thoroughly
const runTests = async () => {
  console.log('=====================================================');
  console.log('STARTING ACTIONABLE REPORTS DATE COLUMN VERIFICATION');
  console.log('=====================================================');

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
    // Clean up previous test fixtures if any
    const testPrefix = 'TEST_REPORT_ITEM_';
    await Inventory.deleteMany({ itemName: { $regex: `^${testPrefix}` } });

    // SCENARIO SETUP
    // Item 1: Both Stock In and Stock Out
    const itemBoth = await Inventory.create({
      itemName: `${testPrefix}BOTH`,
      category: 'Terminal Equipment',
      unit: 'Units',
      currentStock: 25,
      minimumStock: 5,
      description: 'Item with both IN and OUT movements'
    });

    // Item 2: Only Stock In
    const itemOnlyIn = await Inventory.create({
      itemName: `${testPrefix}ONLY_IN`,
      category: 'Connectivity',
      unit: 'Meters',
      currentStock: 100,
      minimumStock: 20,
      description: 'Item with only IN movements'
    });

    // Item 3: Only Stock Out
    const itemOnlyOut = await Inventory.create({
      itemName: `${testPrefix}ONLY_OUT`,
      category: 'Distribution',
      unit: 'Pieces',
      currentStock: 10,
      minimumStock: 2,
      description: 'Item with only OUT movements'
    });

    // Item 4: No movements
    const itemNone = await Inventory.create({
      itemName: `${testPrefix}NONE`,
      category: 'Infrastructure',
      unit: 'Nos',
      currentStock: 50,
      minimumStock: 10,
      description: 'Item with no movements'
    });

    // Create Transactions for Item 1 (Both) with multiple IN and OUT to test latest date selection (Scenario 5)
    // Earlier IN
    await Transaction.create({
      item: itemBoth._id,
      quantity: 10,
      type: 'IN',
      user: 'John Tech',
      date: '2026-10-01',
      time: '09:00',
      createdAt: new Date('2026-10-01T09:00:00Z'),
      remarks: 'Initial batch'
    });
    // Later IN (qualifying latest)
    await Transaction.create({
      item: itemBoth._id,
      quantity: 20,
      type: 'IN',
      user: 'John Tech',
      date: '2026-10-10',
      time: '14:30',
      createdAt: new Date('2026-10-10T14:30:00Z'),
      remarks: 'Restock batch'
    });
    // Earlier OUT
    await Transaction.create({
      item: itemBoth._id,
      quantity: 2,
      type: 'OUT',
      user: 'Alice Engineer',
      date: '2026-10-05',
      time: '11:15',
      createdAt: new Date('2026-10-05T11:15:00Z'),
      remarks: 'Dispatch 1'
    });
    // Later OUT (qualifying latest)
    await Transaction.create({
      item: itemBoth._id,
      quantity: 3,
      type: 'OUT',
      user: 'Bob Specialist',
      date: '2026-10-12',
      time: '16:45',
      createdAt: new Date('2026-10-12T16:45:00Z'),
      remarks: 'Dispatch 2'
    });

    // Transactions for Item 2 (Only IN)
    await Transaction.create({
      item: itemOnlyIn._id,
      quantity: 100,
      type: 'IN',
      user: 'Warehouse Lead',
      date: '2026-10-08',
      time: '10:00',
      createdAt: new Date('2026-10-08T10:00:00Z'),
      remarks: 'Bulk shipment'
    });

    // Transactions for Item 3 (Only OUT)
    await Transaction.create({
      item: itemOnlyOut._id,
      quantity: 5,
      type: 'OUT',
      user: 'David Field',
      date: '2026-10-11',
      time: '13:20',
      createdAt: new Date('2026-10-11T13:20:00Z'),
      remarks: 'Field deployment'
    });

    // Let's import the actual reportController getAggregatedData or query via controller
    const { getReportSummary, exportExcel, exportPDF } = await import('../controllers/reportController.js');

    // Run report summary controller via mock req/res
    const mockRequest = (query = {}) => ({ query });
    const mockResponse = () => {
      const res = {
        statusCode: 200,
        headers: {},
        jsonData: null,
        status(code) { res.statusCode = code; return res; },
        json(data) { res.jsonData = data; return res; },
        setHeader(k, v) { res.headers[k] = v; return res; },
        end() { return res; }
      };
      return res;
    };

    console.log('\n--- Scenario 1: Item with both IN and OUT transactions ---');
    const res1 = mockResponse();
    await getReportSummary(mockRequest({}), res1);
    const rows1 = res1.jsonData?.data?.rows || [];
    const bothRow = rows1.find(r => r.itemName === `${testPrefix}BOTH`);

    assert(bothRow !== undefined, 'Found row for item with both movements');
    assert(bothRow?.lastStockInDate === '10 Oct 2026, 2:30 PM', `Item has correct latest Stock In Date (got: "${bothRow?.lastStockInDate}")`);
    assert(bothRow?.lastStockOutDate === '12 Oct 2026, 4:45 PM', `Item has correct latest Stock Out Date (got: "${bothRow?.lastStockOutDate}")`);
    assert(bothRow?.qtyIn === '30 Units', `Qty In is calculated correctly (got: "${bothRow?.qtyIn}")`);
    assert(bothRow?.qtyOut === '5 Units', `Qty Out is calculated correctly (got: "${bothRow?.qtyOut}")`);
    assert(bothRow?.netChange === '+25 Units', `Net Change is accurate (got: "${bothRow?.netChange}")`);
    assert(bothRow?.lastEmployee === 'Bob Specialist', `Last Employee matches latest OUT transaction (got: "${bothRow?.lastEmployee}")`);

    console.log('\n--- Scenario 2: Item with only Stock In activity ---');
    const onlyInRow = rows1.find(r => r.itemName === `${testPrefix}ONLY_IN`);
    assert(onlyInRow !== undefined, 'Found row for item with only IN movements');
    assert(onlyInRow?.lastStockInDate === '8 Oct 2026, 10:00 AM', `Item has valid Stock In Date (got: "${onlyInRow?.lastStockInDate}")`);
    assert(onlyInRow?.lastStockOutDate === null, `Item has null lastStockOutDate (got: "${onlyInRow?.lastStockOutDate}")`);
    assert(onlyInRow?.qtyIn === '100 Meters', `Qty In is accurate (got: "${onlyInRow?.qtyIn}")`);
    assert(onlyInRow?.qtyOut === '0 Meters', `Qty Out is 0 (got: "${onlyInRow?.qtyOut}")`);

    console.log('\n--- Scenario 3: Item with only Stock Out activity ---');
    const onlyOutRow = rows1.find(r => r.itemName === `${testPrefix}ONLY_OUT`);
    assert(onlyOutRow !== undefined, 'Found row for item with only OUT movements');
    assert(onlyOutRow?.lastStockInDate === null, `Item has null lastStockInDate (got: "${onlyOutRow?.lastStockInDate}")`);
    assert(onlyOutRow?.lastStockOutDate === '11 Oct 2026, 1:20 PM', `Item has valid Stock Out Date (got: "${onlyOutRow?.lastStockOutDate}")`);
    assert(onlyOutRow?.qtyIn === '0 Pieces', `Qty In is 0 (got: "${onlyOutRow?.qtyIn}")`);
    assert(onlyOutRow?.qtyOut === '5 Pieces', `Qty Out is accurate (got: "${onlyOutRow?.qtyOut}")`);

    console.log('\n--- Scenario 4: Item with no movement history ---');
    const noneRow = rows1.find(r => r.itemName === `${testPrefix}NONE`);
    assert(noneRow !== undefined, 'Found row for item with no movements');
    assert(noneRow?.lastStockInDate === null, 'Item has null for lastStockInDate');
    assert(noneRow?.lastStockOutDate === null, 'Item has null for lastStockOutDate');
    assert(noneRow?.lastStockInDate !== getLocalDateString(), 'Never falls back to current date');
    assert(noneRow?.qtyIn === '0 Nos', 'Qty In is 0 Nos');
    assert(noneRow?.qtyOut === '0 Nos', 'Qty Out is 0 Nos');
    assert(noneRow?.netChange === '0 Nos', 'Net Change is 0 Nos');

    console.log('\n--- Scenario 5: Multiple transactions display the latest qualifying date ---');
    // We already verified Item 1 picked 2026-10-10 over 2026-10-01 for IN and 2026-10-12 over 2026-10-05 for OUT
    assert(bothRow?.lastStockInDate === '10 Oct 2026, 2:30 PM', 'Selected 10 Oct over 1 Oct for IN');
    assert(bothRow?.lastStockOutDate === '12 Oct 2026, 4:45 PM', 'Selected 12 Oct over 5 Oct for OUT');

    console.log('\n--- Scenario 6: Filtering by Date Range, Employee, and Category ---');
    // Test Date Range Filter: Only 2026-10-01 to 2026-10-06
    const resDateFilter = mockResponse();
    await getReportSummary(mockRequest({ startDate: '2026-10-01', endDate: '2026-10-06' }), resDateFilter);
    const dateFilteredRows = resDateFilter.jsonData?.data?.rows || [];
    const dateBothRow = dateFilteredRows.find(r => r.itemName === `${testPrefix}BOTH`);
    assert(dateBothRow?.lastStockInDate === '1 Oct 2026, 9:00 AM', `Date filter restricts to 1 Oct (got: "${dateBothRow?.lastStockInDate}")`);
    assert(dateBothRow?.lastStockOutDate === '5 Oct 2026, 11:15 AM', `Date filter restricts to 5 Oct (got: "${dateBothRow?.lastStockOutDate}")`);

    // Test Employee Filter: Only "Bob Specialist"
    const resEmpFilter = mockResponse();
    await getReportSummary(mockRequest({ employee: 'Bob Specialist' }), resEmpFilter);
    const empFilteredRows = resEmpFilter.jsonData?.data?.rows || [];
    const empBothRow = empFilteredRows.find(r => r.itemName === `${testPrefix}BOTH`);
    assert(empBothRow?.lastStockInDate === null, `No IN by Bob Specialist -> lastStockInDate is null`);
    assert(empBothRow?.lastStockOutDate === '12 Oct 2026, 4:45 PM', `OUT by Bob Specialist -> lastStockOutDate is 12 Oct`);

    // Test Category Filter: Only "Terminal Equipment"
    const resCatFilter = mockResponse();
    await getReportSummary(mockRequest({ category: 'Terminal Equipment' }), resCatFilter);
    const catFilteredRows = resCatFilter.jsonData?.data?.rows || [];
    assert(catFilteredRows.every(r => r.category === 'Terminal Equipment'), 'All rows match Terminal Equipment category');
    assert(catFilteredRows.some(r => r.itemName === `${testPrefix}BOTH`), 'Category filter includes Terminal Equipment item');
    assert(!catFilteredRows.some(r => r.itemName === `${testPrefix}ONLY_IN`), 'Category filter excludes Connectivity item');

    console.log('\n--- Scenario 7: PDF and Excel Exports verification ---');
    // Verify Excel generation
    const mockExcelRes = {
      headers: {},
      chunks: [],
      setHeader(k, v) { this.headers[k] = v; },
      write(chunk) { this.chunks.push(chunk); },
      end() {}
    };
    await exportExcel(mockRequest({}), mockExcelRes);
    assert(mockExcelRes.headers['Content-Type']?.includes('spreadsheetml'), 'Excel Content-Type header set correctly');
    assert(mockExcelRes.headers['Content-Disposition']?.includes('vlink_material_usage_report.xlsx'), 'Excel filename disposition set correctly');

    // Verify PDF generation
    const mockPdfRes = {
      headers: {},
      chunks: [],
      headersSent: false,
      setHeader(k, v) { this.headers[k] = v; },
      write(chunk) { this.chunks.push(chunk); },
      emit() {},
      on() { return this; },
      once() { return this; },
      end() {}
    };
    await exportPDF(mockRequest({}), mockPdfRes);
    assert(mockPdfRes.headers['Content-Type'] === 'application/pdf', 'PDF Content-Type header set correctly');
    assert(mockPdfRes.headers['Content-Disposition']?.includes('vlink_material_usage_report.pdf'), 'PDF filename disposition set correctly');

    console.log('\n--- Scenario 8: Dashboard metrics and stock calculations remain intact ---');
    const { getDashboardStats } = await import('../controllers/dashboardController.js');
    const mockDashRes = mockResponse();
    await getDashboardStats(mockRequest({}), mockDashRes);
    assert(mockDashRes.statusCode === 200, 'Dashboard stats API returns 200');
    assert(mockDashRes.jsonData?.success === true, 'Dashboard stats success is true');
    assert(typeof mockDashRes.jsonData?.data?.totalStock === 'number', 'Total stock metric is preserved');

    // Clean up test data
    await Inventory.deleteMany({ itemName: { $regex: `^${testPrefix}` } });
    await Transaction.deleteMany({ item: { $in: [itemBoth._id, itemOnlyIn._id, itemOnlyOut._id, itemNone._id] } });

    console.log('\n=====================================================');
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('=====================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
};

runTests();
