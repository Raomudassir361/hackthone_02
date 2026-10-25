import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';

const app = createApp();

// Auto-connect to DB
connectDB().catch((err) => console.error('DB connect error:', err));

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(env.PORT, () => {
    console.log(`🚀 HCM Lite server listening on http://localhost:${env.PORT}`);
    console.log(`🏥 Health check at http://localhost:${env.PORT}/api/health`);
  });
}

export default app;
