import Inventory from '../models/Inventory.js';
import Transaction from '../models/Transaction.js';
import DailyEntry from '../models/DailyEntry.js';
import { getLocalDateString } from '../utils/dateUtils.js';

export const getDashboardStats = async (req, res) => {
  try {
    // 1. Calculate total available units across the plant
    const items = await Inventory.find({});
    const totalStock = items.reduce((acc, curr) => acc + curr.currentStock, 0);

    // 2. Count distinct items currently hitting danger levels
    const lowStockCount = items.filter(item => item.currentStock <= item.minimumStock).length;

    // 3. Gather today's transactional operational flows using local date
    const todayStr = getLocalDateString();
    
    const todayEntriesCount = await DailyEntry.countDocuments({ date: todayStr });

    // 4. Sum up items issued outward today
    const transactionsToday = await Transaction.find({ date: todayStr, type: 'OUT' });
    const todayUsage = transactionsToday.reduce((acc, curr) => acc + curr.quantity, 0);

    // 5. Fetch 5 most recent activities for the dynamic feed
    const recentActivity = await Transaction.find({})
      .populate('item', 'itemName')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        totalStock,
        lowStockCount,
        todayEntriesCount,
        todayUsage,
        recentActivity
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
