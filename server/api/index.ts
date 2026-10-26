/**
 * Vercel Serverless Function Entry Point
 *
 * This file is the single serverless handler for the entire Express app.
 * Vercel routes all requests to this file via vercel.json.
 * The DB connection is cached between warm invocations to avoid reconnect overhead.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDB } from '../src/config/db.js';

// Cache the express app across warm serverless invocations
const app = createApp();

// Kick off DB connection once; Mongoose caches the connection internally
let dbConnected = false;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!dbConnected || mongoose.connection.readyState !== 1) {
    const conn = await connectDB();
    if (conn && mongoose.connection.readyState === 1) {
      dbConnected = true;
    }
  }

  // If MongoDB is not connected on Vercel, return clear error instead of letting Mongoose timeout
  if (mongoose.connection.readyState !== 1 && req.url !== '/api/health' && req.url !== '/api') {
    return res.status(503).json({
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'Database connection failed. Please ensure MONGODB_URI is configured in Vercel environment variables and Atlas allows 0.0.0.0/0 IP access.',
      },
    });
  }

  // Delegate to Express
  return new Promise<void>((resolve, reject) => {
    // @ts-expect-error – Express handler signature is compatible with Vercel req/res
    app(req, res, (err: unknown) => {
      if (err) reject(err);
      else resolve();
    });
  });
}
