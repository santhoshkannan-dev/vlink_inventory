import express from 'express';
import { 
  getInventory, 
  processStockIn, 
  processStockOut, 
  getAlerts,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  deleteBatchInventoryItems
} from '../controllers/inventoryController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// View inventory catalog items (Allowed for both Admin and Staff)
router.get('/', protect, authorize('Admin', 'Staff'), getInventory);

// ONLY Admins can create, update, or delete/archive catalog items
router.post('/', protect, authorize('Admin'), createInventoryItem);
router.post('/batch-delete', protect, authorize('Admin'), deleteBatchInventoryItems);
router.delete('/batch', protect, authorize('Admin'), deleteBatchInventoryItems);
router.put('/:id', protect, authorize('Admin'), updateInventoryItem);
router.delete('/:id', protect, authorize('Admin'), deleteInventoryItem);

// ONLY Admins can process bulk Stock In vendor entries
router.post('/stock-in', protect, authorize('Admin'), processStockIn);

// Both Admin and Staff can process stock out and view alerts
router.get('/alerts', protect, authorize('Admin', 'Staff'), getAlerts);
router.post('/stock-out', protect, authorize('Admin', 'Staff'), processStockOut);

export default router;
