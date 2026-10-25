import mongoose from 'mongoose';
import { env } from './env.js';

// Cache connection state for serverless warm invocations
let isConnected = false;

export async function connectDB(uri?: string): Promise<typeof mongoose | null> {
  const mongoUri = uri || env.MONGODB_URI;

  // Already connected (warm serverless invocation)
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose;
  }

  // Reject placeholder URIs — refuse to start with dummy config
  if (mongoUri.includes('<db_password>') || mongoUri.includes('<password>')) {
    console.error('❌ MONGODB_URI contains placeholder. Set a real URI in Vercel env vars or .env');
    return null;
  }

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
    });
    isConnected = true;
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    isConnected = false;
    const isVercel = !!process.env.VERCEL;

    if (isVercel) {
      // On Vercel, log and continue — don't crash the process
      console.error('⚠️ MongoDB connection failed on Vercel:', (error as Error).message);
      return null;
    }

    // In local dev, fall back to in-memory MongoDB
    console.warn('⚠️ MongoDB connection failed, falling back to in-memory:', (error as Error).message);
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const fallbackUri = mongod.getUri();
      const conn = await mongoose.connect(fallbackUri);
      isConnected = true;
      console.log(`✅ In-memory MongoDB fallback connected: ${conn.connection.host}`);
      return conn;
    } catch (innerErr) {
      console.error('Failed in-memory fallback:', innerErr);
      return null;
    }
  }
}

export async function disconnectDB(): Promise<void> {
  isConnected = false;
  await mongoose.disconnect();
}
