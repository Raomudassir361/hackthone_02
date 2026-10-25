"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_js_1 = require("./app.js");
const env_js_1 = require("./config/env.js");
const db_js_1 = require("./config/db.js");
async function bootstrap() {
    await (0, db_js_1.connectDB)();
    const app = (0, app_js_1.createApp)();
    const server = app.listen(env_js_1.env.PORT, () => {
        console.log(`🚀 HCM Lite server listening on http://localhost:${env_js_1.env.PORT}`);
        console.log(`🏥 Health check at http://localhost:${env_js_1.env.PORT}/api/health`);
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
