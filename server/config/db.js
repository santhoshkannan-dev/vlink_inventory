import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

let mongod = null;

import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);

const connectDB = async () => {
  try {
    let dbUrl = process.env.MONGO_URI;

    // Operational Debug Check
    console.log(`📡 Attempting connection using string: ${dbUrl ? 'FOUND IN ENV' : 'NOT FOUND (UNDEFINED)'}`);

    if (!dbUrl) {
      console.log('No MONGO_URI provided. Initializing in-memory MongoDB replica set fallback...');
      mongod = await MongoMemoryReplSet.create({
        replSet: { storageEngine: 'wiredTiger' }
      });
      dbUrl = mongod.getUri();
    }

    // Force IPv4 configuration mapping rules
    const conn = await mongoose.connect(dbUrl, {
      family: 4 // Bypasses local network ipv6 routing drops
    });

    console.log(`🍃 MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    console.log('Attempting in-memory MongoDB fallback...');
    try {
      mongod = await MongoMemoryReplSet.create({
        replSet: { storageEngine: 'wiredTiger' }
      });
      const dbUrl = mongod.getUri();
      const conn = await mongoose.connect(dbUrl, { family: 4 });
      console.log(`🍃 In-Memory MongoDB Connected: ${conn.connection.host}`);
    } catch (fallbackErr) {
      console.error(`Fallback connection failed: ${fallbackErr.message}`);
      process.exit(1);
    }
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (mongod) {
      await mongod.stop();
    }
    console.log('🍃 MongoDB Disconnected');
  } catch (err) {
    console.error('Error disconnecting MongoDB:', err.message);
  }
};

export default connectDB;
export { connectDB, disconnectDB, mongod };