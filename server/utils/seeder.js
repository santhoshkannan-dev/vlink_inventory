import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Inventory from '../models/Inventory.js';
import Transaction from '../models/Transaction.js';
import StockIn from '../models/StockIn.js';
import StockOut from '../models/StockOut.js';
import DailyEntry from '../models/DailyEntry.js';
import connectDB from '../config/db.js';

dotenv.config();

const users = [
  {
    name: 'Admin User',
    email: 'admin@vlink.com',
    password: 'adminpassword123',
    role: 'Admin'
  },
  {
    name: 'Staff User',
    email: 'staff@vlink.com',
    password: 'staffpassword123',
    role: 'Staff'
  }
];

const items = [
  {
    itemName: 'Home Node',
    category: 'Terminal Equipment',
    unit: 'Units',
    currentStock: 45,
    minimumStock: 15,
    description: 'Standard residential FTTH home node, 4-port.'
  },
  {
    itemName: 'Patch Code',
    category: 'Connectivity',
    unit: 'Nos',
    currentStock: 85,
    minimumStock: 25,
    description: 'Single mode SC-UPC patch cord 1.5m.'
  },
  {
    itemName: 'Tie Wire',
    category: 'Distribution',
    unit: 'Roll',
    currentStock: 120,
    minimumStock: 30,
    description: 'Galvanized steel lashing tie wire roll.'
  },
  {
    itemName: 'PLC 1×4',
    category: 'Distribution',
    unit: 'Nos',
    currentStock: 28,
    minimumStock: 10,
    description: 'Planar lightwave circuit 1x4 optical splitter.'
  },
  {
    itemName: 'PLC 1×8',
    category: 'Distribution',
    unit: 'Nos',
    currentStock: 18,
    minimumStock: 10,
    description: 'Planar lightwave circuit 1x8 optical splitter.'
  },
  {
    itemName: 'STB',
    category: 'Terminal Equipment',
    unit: 'Nos',
    currentStock: 35,
    minimumStock: 12,
    description: '4K IPTV Set-Top Box unit.'
  },
  {
    itemName: 'Modem',
    category: 'Terminal Equipment',
    unit: 'Nos',
    currentStock: 22,
    minimumStock: 10,
    description: 'Dual-band Gigabit Wi-Fi ONT modem.'
  },
  {
    itemName: 'Cable',
    category: 'Infrastructure',
    unit: 'Meter',
    currentStock: 1500,
    minimumStock: 300,
    description: '2-core outdoor drop fiber cable.'
  }
];

const seedData = async () => {
  try {
    await connectDB();

    console.log('Clearing existing collections...');
    await User.deleteMany();
    await Inventory.deleteMany();
    await Transaction.deleteMany();
    await StockIn.deleteMany();
    await StockOut.deleteMany();
    await DailyEntry.deleteMany();

    // Seed users
    const createdUsers = [];
    for (const u of users) {
      const newUser = await User.create(u);
      createdUsers.push(newUser);
    }
    console.log(`Seeded ${createdUsers.length} users successfully!`);

    // Seed inventory
    const createdItems = await Inventory.insertMany(items);
    console.log(`Seeded ${createdItems.length} inventory items successfully!`);

    // Create initial stock audit transactions
    const adminUser = createdUsers.find(u => u.role === 'Admin');
    const today = new Date().toISOString().split('T')[0];

    for (const item of createdItems) {
      await Transaction.create({
        item: item._id,
        quantity: item.currentStock,
        type: 'IN',
        user: adminUser?.name || 'Administrator',
        date: today,
        time: '09:00 AM',
        remarks: 'Initial inventory catalog intake'
      });
    }

    console.log('Seeding completed successfully. Closing connection...');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error(`Seeding failed: ${error.message}`);
    process.exit(1);
  }
};

seedData();
