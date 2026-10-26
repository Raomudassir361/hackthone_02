/**
 * Vercel Serverless Function Entry Point
 *
 * This file is the single serverless handler for the entire Express app.
 * Vercel routes all requests to this file via vercel.json.
 * The DB connection is cached between warm invocations to avoid reconnect overhead.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createApp } from '../src/app.js';
import { connectDB } from '../src/config/db.js';

// Cache the express app across warm serverless invocations
const app = createApp();

// Kick off DB connection once; Mongoose caches the connection internally
let dbConnected = false;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!dbConnected) {
    await connectDB();
    dbConnected = true;
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
