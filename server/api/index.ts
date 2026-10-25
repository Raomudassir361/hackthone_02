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
    try {
      await connectDB();
      dbConnected = true;
    } catch (e) {
      console.error('DB connection error in handler:', e);
    }
  }
  // Directly delegate to Express – it will handle the response and end it.
  // No need for a custom Promise wrapper.
  app(req, res);
}
