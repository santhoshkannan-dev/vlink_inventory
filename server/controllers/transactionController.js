import Transaction from '../models/Transaction.js';
import Inventory from '../models/Inventory.js';

export const getTransactions = async (req, res) => {
  try {
    const { itemId, type, employee, startDate, endDate, search, page = 1, limit = 50 } = req.query;

    const query = {};

    // Filter by item
    if (itemId && itemId !== 'All') {
      query.item = itemId;
    }

    // Filter by movement type (IN / OUT)
    if (type && type !== 'All') {
      query.type = type.toUpperCase();
    }

    // Filter by employee
    if (employee && employee !== 'All Employees' && employee !== 'All') {
      query.user = employee;
    }

    // Filter by date range
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      query.date = { $gte: startDate };
    } else if (endDate) {
      query.date = { $lte: endDate };
    }

    // Search by transactionId or remarks
    if (search && search.trim()) {
      const s = search.trim();
      // Search matching item IDs first
      const matchingItems = await Inventory.find({
        $or: [
          { itemName: { $regex: s, $options: 'i' } },
          { sku: { $regex: s, $options: 'i' } }
        ]
      }).select('_id');
      const itemIds = matchingItems.map(i => i._id);

      query.$or = [
        { transactionId: { $regex: s, $options: 'i' } },
        { remarks: { $regex: s, $options: 'i' } },
        { user: { $regex: s, $options: 'i' } },
        { item: { $in: itemIds } }
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [transactions, totalCount] = await Promise.all([
      Transaction.find(query)
        .populate('item', 'itemName category unit sku isArchived currentStock')
        .sort({ transactionDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Transaction.countDocuments(query)
    ]);

    // Calculate aggregated metrics for current filter context
    const allMatching = await Transaction.find(query).select('type quantity').lean();
    let totalInQty = 0;
    let totalOutQty = 0;
    allMatching.forEach(t => {
      if (t.type === 'IN') totalInQty += t.quantity;
      if (t.type === 'OUT') totalOutQty += t.quantity;
    });

    res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        total: totalCount,
        page: pageNum,
        pages: Math.ceil(totalCount / limitNum) || 1,
        limit: limitNum
      },
      metrics: {
        totalMovements: totalCount,
        totalInQty,
        totalOutQty
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
