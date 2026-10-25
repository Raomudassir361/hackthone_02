import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDB(uri?: string): Promise<typeof mongoose | null> {
  let mongoUri = uri || env.MONGODB_URI;

  // Auto-fallback: if MONGODB_URI still contains placeholder '<db_password>', use embedded Mongo in dev
  if (mongoUri.includes('<db_password>') || mongoUri.includes('<password>')) {
    console.warn('⚠️ MONGODB_URI contains placeholder <db_password>. Starting in-memory MongoDB for local development/demo...');
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      mongoUri = mongod.getUri();
      console.log('✅ In-memory MongoDB started:', mongoUri);
    } catch (e) {
      console.error('Failed to start in-memory Mongo:', e);
    }
  }

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.warn('⚠️ MongoDB connection warning (will retry with local in-memory instance):', (error as Error).message);
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const fallbackUri = mongod.getUri();
      const conn = await mongoose.connect(fallbackUri);
      console.log(`✅ In-memory MongoDB fallback connected: ${conn.connection.host}`);
      return conn;
    } catch (innerErr) {
      console.error('Failed in-memory fallback:', innerErr);
      return null;
    }
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
