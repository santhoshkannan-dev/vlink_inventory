import express from 'express';
import { registerUser, loginUser, getMe, updatePassword } from '../controllers/authController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Register is strictly restricted to Admin users
router.post('/register', protect, authorize('Admin'), registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.put('/update-password', protect, updatePassword);

export default router;
