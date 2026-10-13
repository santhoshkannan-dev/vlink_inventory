import express from 'express';
import { getTransactions } from '../controllers/transactionController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get stock movement history audit ledger (accessible to Admin and Staff)
router.get('/', protect, authorize('Admin', 'Staff'), getTransactions);

export default router;
