import Inventory from '../models/Inventory.js';
import Transaction from '../models/Transaction.js';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

// Helper to aggregate report data using Transaction ledger
const getAggregatedData = async (filters) => {
  const { startDate, endDate, employee, category } = filters;

  // Build query for Transaction
  let transactionQuery = {};
  if (startDate && endDate) {
    transactionQuery.date = { $gte: startDate, $lte: endDate };
  } else if (startDate) {
    transactionQuery.date = { $gte: startDate };
  } else if (endDate) {
    transactionQuery.date = { $lte: endDate };
  }

  if (employee && employee !== 'All Employees' && employee !== 'All') {
    transactionQuery.user = employee;
  }

  // Fetch transactions and populate item
  const transactions = await Transaction.find(transactionQuery)
    .populate('item')
    .sort({ createdAt: -1 });

  // Build query for Inventory catalog
  let itemQuery = {};
  if (category && category !== 'All Categories' && category !== 'All') {
    itemQuery.category = category;
  }
  const items = await Inventory.find(itemQuery);

  const reportMap = {};

  // Initialize report rows for each matching inventory item
  items.forEach(item => {
    reportMap[item._id.toString()] = {
      itemId: item._id,
      sku: `SKU-${item.category.substring(0, 3).toUpperCase()}-${item.itemName.substring(0, 3).toUpperCase()}`,
      itemName: item.itemName,
      category: item.category,
      unit: item.unit,
      qtyIn: 0,
      qtyOut: 0,
      netChange: 0,
      lastEmployee: 'N/A',
      lastTimestamp: 0,
      currentStock: item.currentStock,
      minimumStock: item.minimumStock,
      status: item.currentStock === 0 ? 'OUT OF STOCK' : (item.currentStock <= item.minimumStock ? 'LOW STOCK' : 'OPTIMAL')
    };
  });

  // Aggregate from Transaction ledger
  transactions.forEach(t => {
    if (!t.item) return;
    const idStr = t.item._id.toString();
    if (reportMap[idStr]) {
      if (t.type === 'IN') {
        reportMap[idStr].qtyIn += t.quantity;
      } else {
        reportMap[idStr].qtyOut += t.quantity;
        const ts = new Date(t.createdAt).getTime() || 0;
        if (ts > reportMap[idStr].lastTimestamp) {
          reportMap[idStr].lastEmployee = t.user;
          reportMap[idStr].lastTimestamp = ts;
        }
      }
    }
  });

  // Calculate net changes and format strings
  const reportRows = Object.values(reportMap).map(row => {
    const net = row.qtyIn - row.qtyOut;
    row.netChange = net !== 0 ? `${net > 0 ? '+' : ''}${net} ${row.unit}` : `0 ${row.unit}`;
    row.qtyIn = `${row.qtyIn} ${row.unit}`;
    row.qtyOut = `${row.qtyOut} ${row.unit}`;
    return row;
  });

  // Calculate real KPIs
  const totalMovements = transactions.length;
  const totalUnitsDispatched = transactions
    .filter(t => t.type === 'OUT')
    .reduce((acc, curr) => acc + curr.quantity, 0);

  const criticalStockAlerts = items.filter(item => item.currentStock <= item.minimumStock).length;

  return {
    rows: reportRows,
    transactions,
    kpis: {
      totalMovements,
      totalUnitsDispatched,
      criticalStockAlerts: String(criticalStockAlerts).padStart(2, '0')
    }
  };
};

export const getReportSummary = async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      employee: req.query.employee,
      category: req.query.category
    };
    const reportData = await getAggregatedData(filters);

    res.status(200).json({
      success: true,
      data: {
        totalMovements: reportData.kpis.totalMovements,
        totalUnitsDispatched: reportData.kpis.totalUnitsDispatched,
        inventoryValueOut: reportData.kpis.totalUnitsDispatched, // Compatible fallback
        criticalAlerts: reportData.kpis.criticalStockAlerts,
        rows: reportData.rows
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const exportExcel = async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      employee: req.query.employee,
      category: req.query.category
    };

    const reportData = await getAggregatedData(filters);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'VLink Networks';
    workbook.created = new Date();

    // ==========================================
    // WORKSHEET 1: Summary by Material
    // ==========================================
    const worksheet = workbook.addWorksheet('Material Usage Summary');

    // Title Section
    const titleRow = worksheet.addRow(['VLink Networks — Inventory Management System']);
    titleRow.getCell(1).font = { bold: true, size: 16, color: { argb: 'FF1E293B' } };
    worksheet.mergeCells('A1:H1');

    const subtitleRow = worksheet.addRow(['Aggregated Material Usage Summary']);
    subtitleRow.getCell(1).font = { bold: true, size: 12, color: { argb: 'FF64748B' } };
    worksheet.mergeCells('A2:H2');

    worksheet.addRow([]);

    // Filter Info
    const filterStyle = { font: { size: 10, color: { argb: 'FF475569' } } };
    const r1 = worksheet.addRow([`Date Range: ${filters.startDate || 'All Time'} — ${filters.endDate || 'All Time'}`]);
    r1.getCell(1).font = filterStyle.font;
    const r2 = worksheet.addRow([`Technician: ${filters.employee || 'All'}   |   Category: ${filters.category || 'All'}`]);
    r2.getCell(1).font = filterStyle.font;
    worksheet.addRow([]);

    // KPI Row
    const kpiRow = worksheet.addRow([
      'Total Movements', reportData.kpis.totalMovements, '',
      'Units Dispatched', reportData.kpis.totalUnitsDispatched, '',
      'Critical Alerts', reportData.kpis.criticalStockAlerts
    ]);
    kpiRow.eachCell((cell, colNum) => {
      if (colNum % 3 === 1) {
        cell.font = { bold: true, size: 9, color: { argb: 'FF94A3B8' } };
      } else {
        cell.font = { bold: true, size: 11, color: { argb: 'FF1E293B' } };
      }
    });
    worksheet.addRow([]);

    // Header Row
    const headers = ['Item Code (SKU)', 'Product Description', 'Category', 'Qty In', 'Qty Out', 'Net Change', 'Last Employee', 'Status'];
    const headerRow = worksheet.addRow(headers);
    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    const headerFont = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    headerRow.eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF334155' } },
        bottom: { style: 'thin', color: { argb: 'FF334155' } },
        left: { style: 'thin', color: { argb: 'FF334155' } },
        right: { style: 'thin', color: { argb: 'FF334155' } }
      };
    });
    headerRow.height = 28;

    // Data Rows
    reportData.rows.forEach((row, idx) => {
      const dataRow = worksheet.addRow([
        row.sku, row.itemName, row.category, row.qtyIn, row.qtyOut, row.netChange, row.lastEmployee, row.status
      ]);
      const bgColor = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';
      dataRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
        cell.font = { size: 10, color: { argb: 'FF334155' } };
        cell.alignment = { vertical: 'middle' };
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
      });
      const statusCell = dataRow.getCell(8);
      if (row.status === 'OPTIMAL') {
        statusCell.font = { bold: true, size: 10, color: { argb: 'FF059669' } };
      } else if (row.status === 'LOW STOCK') {
        statusCell.font = { bold: true, size: 10, color: { argb: 'FFD97706' } };
      } else {
        statusCell.font = { bold: true, size: 10, color: { argb: 'FFDC2626' } };
      }
    });

    worksheet.columns = [
      { width: 20 }, { width: 28 }, { width: 20 }, { width: 16 },
      { width: 16 }, { width: 16 }, { width: 22 }, { width: 16 }
    ];

    // ==========================================
    // WORKSHEET 2: Stock Movement History (Transaction Details)
    // ==========================================
    const historySheet = workbook.addWorksheet('Stock Movement History');
    const hTitle = historySheet.addRow(['VLink Networks — Stock Movement Audit History']);
    hTitle.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF1E293B' } };
    historySheet.mergeCells('A1:G1');
    historySheet.addRow([]);

    const hHeaders = ['Date', 'Time', 'Type', 'Item Name', 'Quantity', 'Handled By', 'Remarks / Audit Note'];
    const hHeaderRow = historySheet.addRow(hHeaders);
    hHeaderRow.eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    hHeaderRow.height = 26;

    reportData.transactions.forEach((tx, idx) => {
      const row = historySheet.addRow([
        tx.date,
        tx.time,
        tx.type,
        tx.item?.itemName || 'Unknown Item',
        `${tx.quantity} ${tx.item?.unit || 'Nos'}`,
        tx.user || 'System',
        tx.remarks || '-'
      ]);
      const bgColor = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';
      row.eachCell((cell, col) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
        cell.font = { size: 9, color: { argb: 'FF334155' } };
        if (col === 3) {
          cell.font = { bold: true, size: 9, color: { argb: tx.type === 'IN' ? 'FF059669' : 'FFDC2626' } };
        }
      });
    });

    historySheet.columns = [
      { width: 14 }, { width: 12 }, { width: 10 }, { width: 26 },
      { width: 16 }, { width: 22 }, { width: 40 }
    ];

    // Response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=vlink_material_usage_report.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const exportPDF = async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      employee: req.query.employee,
      category: req.query.category
    };

    const reportData = await getAggregatedData(filters);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=vlink_material_usage_report.pdf');

    doc.pipe(res);

    // Header Banner
    doc.rect(0, 0, 595, 80).fill('#1E293B');
    doc.fillColor('#FFFFFF').fontSize(20).font('Helvetica-Bold').text('VLink Networks', 40, 22);
    doc.fillColor('#94A3B8').fontSize(10).font('Helvetica').text('Inventory Management System — Material Usage Report', 40, 48);

    doc.moveDown(3);
    const afterHeader = 100;

    // Filter Info
    doc.fillColor('#475569').fontSize(9).font('Helvetica');
    doc.text(`Date Range: ${filters.startDate || 'All Time'} to ${filters.endDate || 'All Time'}`, 40, afterHeader);
    doc.text(`Technician: ${filters.employee || 'All'}   |   Category: ${filters.category || 'All'}`, 40, afterHeader + 14);

    // KPI Cards
    const kpiY = afterHeader + 36;
    const kpiBoxWidth = 165;
    const kpiGap = 10;

    // Card 1: Total Movements
    doc.rect(40, kpiY, kpiBoxWidth, 48).fill('#F1F5F9');
    doc.fillColor('#64748B').fontSize(8).font('Helvetica-Bold').text('TOTAL MOVEMENTS', 50, kpiY + 8);
    doc.fillColor('#1E293B').fontSize(16).font('Helvetica-Bold').text(String(reportData.kpis.totalMovements), 50, kpiY + 24);

    // Card 2: Units Dispatched
    doc.rect(40 + kpiBoxWidth + kpiGap, kpiY, kpiBoxWidth, 48).fill('#F1F5F9');
    doc.fillColor('#64748B').fontSize(8).font('Helvetica-Bold').text('UNITS DISPATCHED', 50 + kpiBoxWidth + kpiGap, kpiY + 8);
    doc.fillColor('#1E293B').fontSize(16).font('Helvetica-Bold').text(String(reportData.kpis.totalUnitsDispatched), 50 + kpiBoxWidth + kpiGap, kpiY + 24);

    // Card 3: Critical Alerts
    doc.rect(40 + (kpiBoxWidth + kpiGap) * 2, kpiY, kpiBoxWidth, 48).fill('#FEF2F2');
    doc.fillColor('#DC2626').fontSize(8).font('Helvetica-Bold').text('CRITICAL ALERTS', 50 + (kpiBoxWidth + kpiGap) * 2, kpiY + 8);
    doc.fillColor('#DC2626').fontSize(16).font('Helvetica-Bold').text(reportData.kpis.criticalStockAlerts, 50 + (kpiBoxWidth + kpiGap) * 2, kpiY + 24);

    // Table 1: Aggregated Summary
    const tableTop = kpiY + 62;
    const colWidths = [70, 100, 55, 55, 65, 85, 60];
    const colX = [40];
    for (let i = 1; i < colWidths.length; i++) {
      colX.push(colX[i - 1] + colWidths[i - 1] + 4);
    }

    const drawTableHeader = (y, title = 'MATERIAL USAGE SUMMARY') => {
      doc.fillColor('#0F172A').fontSize(9).font('Helvetica-Bold').text(title, 40, y - 14);
      doc.rect(40, y, 520, 20).fill('#1E293B');
      doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
      const headers = ['SKU', 'Description', 'Qty In', 'Qty Out', 'Net Change', 'Last Employee', 'Status'];
      headers.forEach((h, i) => {
        doc.text(h, colX[i] + 4, y + 6, { width: colWidths[i], align: i >= 2 && i <= 4 ? 'right' : 'left' });
      });
      return y + 24;
    };

    let y = drawTableHeader(tableTop);

    reportData.rows.forEach((row, idx) => {
      if (y > 740) {
        doc.fillColor('#94A3B8').fontSize(7).font('Helvetica').text('VLink Networks — Confidential', 40, 800, { align: 'center', width: 520 });
        doc.addPage();
        y = drawTableHeader(40);
      }

      if (idx % 2 === 0) {
        doc.rect(40, y - 2, 520, 18).fill('#F8FAFC');
      }

      doc.fillColor('#334155').fontSize(8).font('Helvetica');
      doc.text(row.sku, colX[0] + 4, y + 2, { width: colWidths[0] });
      doc.text(row.itemName.substring(0, 20), colX[1] + 4, y + 2, { width: colWidths[1] });
      doc.text(row.qtyIn, colX[2] + 4, y + 2, { width: colWidths[2], align: 'right' });

      doc.fillColor('#DC2626').font('Helvetica-Bold');
      doc.text(row.qtyOut, colX[3] + 4, y + 2, { width: colWidths[3], align: 'right' });

      const netColor = row.netChange.startsWith('+') ? '#059669' : '#334155';
      doc.fillColor(netColor).font('Helvetica-Bold');
      doc.text(row.netChange, colX[4] + 4, y + 2, { width: colWidths[4], align: 'right' });

      doc.fillColor('#475569').font('Helvetica');
      doc.text(row.lastEmployee, colX[5] + 4, y + 2, { width: colWidths[5] });

      const statusColor = row.status === 'OPTIMAL' ? '#059669' : row.status === 'LOW STOCK' ? '#D97706' : '#DC2626';
      doc.fillColor(statusColor).font('Helvetica-Bold');
      doc.text(row.status, colX[6] + 4, y + 2, { width: colWidths[6] });

      y += 18;
    });

    // Add Section 2: Detailed Transaction Movements Log
    if (reportData.transactions.length > 0) {
      doc.addPage();
      let txY = 40;
      doc.fillColor('#0F172A').fontSize(12).font('Helvetica-Bold').text('DETAILED STOCK MOVEMENT AUDIT LOG', 40, txY);
      txY += 20;

      const txColWidths = [60, 50, 45, 120, 50, 80, 105];
      const txColX = [40];
      for (let i = 1; i < txColWidths.length; i++) {
        txColX.push(txColX[i - 1] + txColWidths[i - 1] + 2);
      }

      const drawTxHeader = (currY) => {
        doc.rect(40, currY, 520, 20).fill('#1E293B');
        doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
        const headers = ['Date', 'Time', 'Type', 'Item Name', 'Qty', 'Handled By', 'Remarks'];
        headers.forEach((h, i) => {
          doc.text(h, txColX[i] + 3, currY + 6, { width: txColWidths[i] });
        });
        return currY + 22;
      };

      txY = drawTxHeader(txY);

      // Render all matching transactions across pages
      reportData.transactions.forEach((tx, idx) => {
        if (txY > 750) {
          doc.addPage();
          txY = drawTxHeader(40);
        }

        if (idx % 2 === 0) {
          doc.rect(40, txY - 2, 520, 16).fill('#F8FAFC');
        }

        doc.fillColor('#475569').fontSize(7.5).font('Helvetica');
        doc.text(tx.date, txColX[0] + 3, txY + 2, { width: txColWidths[0] });
        doc.text(tx.time, txColX[1] + 3, txY + 2, { width: txColWidths[1] });

        doc.fillColor(tx.type === 'IN' ? '#059669' : '#DC2626').font('Helvetica-Bold');
        doc.text(tx.type, txColX[2] + 3, txY + 2, { width: txColWidths[2] });

        doc.fillColor('#1E293B').font('Helvetica');
        doc.text((tx.item?.itemName || 'Item').substring(0, 24), txColX[3] + 3, txY + 2, { width: txColWidths[3] });
        doc.text(String(tx.quantity), txColX[4] + 3, txY + 2, { width: txColWidths[4] });
        doc.text((tx.user || 'System').substring(0, 16), txColX[5] + 3, txY + 2, { width: txColWidths[5] });
        doc.text((tx.remarks || '').substring(0, 25), txColX[6] + 3, txY + 2, { width: txColWidths[6] });

        txY += 16;
      });
    }

    doc.end();
  } catch (error) {
    console.error('PDF Export Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: error.message });
    }
  }
};
