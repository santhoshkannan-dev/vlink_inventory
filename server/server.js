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
import transactionRoutes from './routes/transactionRoutes.js';
import Inventory from './models/Inventory.js';
import Technician from './models/Technician.js';
import User from './models/User.js';

// Initialize DB Connection
connectDB();

const app = express();

const allowedOrigins = [
  'https://vlink-inventory.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean).map(o => o.replace(/\/+$/, ''));

const isOriginAllowed = (origin) => {
  if (!origin) return true; // Allow non-browser requests (curl, postman, server-to-server)
  const normalized = origin.replace(/\/+$/, '');

  // Exact match with configured origins
  if (allowedOrigins.includes(normalized)) return true;

  // Allow all Vercel deployments associated with vlink-inventory (production, preview, and branch URLs)
  if (/^https:\/\/.*vlink-inventory.*\.vercel\.app$/.test(normalized)) return true;

  // Allow local development origins
  if (process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized)) {
    return true;
  }

  return false;
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      // Pass false instead of Error to avoid crashing Express preflight into a 500 error
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Disposition']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Enable pre-flight for all routes
app.use(express.json());

// Ensure default admin & staff accounts exist while preserving all existing users
const seedDefaultData = async () => {
  try {
    const defaultAdminPass = process.env.ADMIN_DEFAULT_PASSWORD || 'adminpassword123';
    const adminExists = await User.findOne({ email: 'admin@vlink.com' });
    if (!adminExists) {
      console.log('🌱 Seeding administrator account (admin@vlink.com)...');
      await User.create({
        name: 'Systems Administrator',
        email: 'admin@vlink.com',
        password: defaultAdminPass,
        role: 'Admin'
      });
      console.log('✅ Administrator account ready. Email: admin@vlink.com');
    }

    const staffExists = await User.findOne({ email: 'staff@vlink.com' });
    if (!staffExists) {
      console.log('🌱 Seeding staff account (staff@vlink.com)...');
      await User.create({
        name: 'Staff Member',
        email: 'staff@vlink.com',
        password: 'staffpassword123',
        role: 'Staff'
      });
      console.log('✅ Staff account ready. Email: staff@vlink.com');
    }
  } catch (err) {
    console.error('Account verification error:', err.message);
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
app.use('/api/transactions', transactionRoutes);

// Root & Health Check Ping Endpoints
app.get('/', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'VLink Networks Inventory Management API', version: '1.0.0' });
});
app.head('/', (req, res) => {
  res.status(200).end();
});
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'UP', message: 'VLink Systems Engine is healthy.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 System API routing running on port ${PORT}`);
});

