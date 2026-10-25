import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';

const app = createApp();

// Only connect DB and listen when NOT running on Vercel serverless
// On Vercel, api/index.ts handles DB connection and request delegation
if (!process.env.VERCEL) {
  connectDB().catch((err) => console.error('DB connect error:', err));

  app.listen(env.PORT, () => {
    console.log(`🚀 HCM Lite server listening on http://localhost:${env.PORT}`);
    console.log(`🏥 Health check at http://localhost:${env.PORT}/api/health`);
  });
}

export default app;
