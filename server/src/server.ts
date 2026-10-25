import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';

async function bootstrap() {
  await connectDB();

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    console.log(`🚀 HCM Lite server listening on http://localhost:${env.PORT}`);
    console.log(`🏥 Health check at http://localhost:${env.PORT}/api/health`);
  });

  const shutdown = async () => {
    console.log('\nShutting down gracefully...');
    server.close(() => {
      console.log('Server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((err) => {
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
