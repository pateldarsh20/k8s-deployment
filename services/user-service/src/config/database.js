const mongoose = require('mongoose');
const { AppError } = require('../../shared/utils/errorHandler');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/habit-tracker-users';

let isConnected = false;

const getMongoOptions = () => {
  const options = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  };

  const uri = MONGODB_URI;
  const match = uri.match(/mongodb:\/\/([^:]+):([^@]+)@/);

  if (match) {
    options.user = match[1];
    options.pass = match[2];
    options.authSource = 'admin';
  }

  return options;
};

/**
 * Connect to MongoDB database
 */
const connectDB = async () => {
  if (isConnected) {
    console.log('📦 MongoDB already connected');
    return;
  }

  try {
    const conn = await mongoose.connect(MONGODB_URI, getMongoOptions());

    isConnected = true;
    console.log(`✅ MongoDB Connected: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB disconnected');
      isConnected = false;
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
