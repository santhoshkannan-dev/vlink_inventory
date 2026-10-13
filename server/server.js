import dotenv from 'dotenv';
dotenv.config(); // ◄ MUST BE LINE 2, BEFORE ALL OTHER IMPORTS

import express from 'express';
import cors from 'cors';
import connectDB from './config/db.js';
import dailyEntryRoutes from './routes/dailyEntryRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import technicianRoutes from './routes/technicianRoutes.js';
import Inventory from './models/Inventory.js';
import Technician from './models/Technician.js';
import User from './models/User.js';

// Initialize DB Connection
connectDB();

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman) or matching allowed origins
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*') || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error(`Blocked by CORS policy: Origin ${origin} not allowed`));
    }
  },
  credentials: true
}));
app.use(express.json());

// Auto-seed default admin user if database is fresh
const seedDefaultData = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      const defaultAdminPass = process.env.ADMIN_DEFAULT_PASSWORD || 'adminpassword123';
      console.log('🌱 Database is empty. Seeding default administrator account...');
      await User.create({
        name: 'Systems Administrator',
        email: 'admin@vlink.com',
        password: defaultAdminPass,
        role: 'Admin'
      });
      console.log('✅ Administrator account seeding completed. Login email: admin@vlink.com');
    }
  } catch (err) {
    console.error('Auto-seeding error:', err.message);
  }
};
seedDefaultData();

// Main App API Mounts
app.use('/api/auth', authRoutes);
app.use('/api/daily-entries', dailyEntryRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/technicians', technicianRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'UP', message: 'VLink Systems Engine is healthy.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 System API routing running on port ${PORT}`);
});

