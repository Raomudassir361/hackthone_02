"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_js_1 = require("./app.js");
const env_js_1 = require("./config/env.js");
const db_js_1 = require("./config/db.js");
const app = (0, app_js_1.createApp)();
// Auto-connect to DB
(0, db_js_1.connectDB)().catch((err) => console.error('DB connect error:', err));
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(env_js_1.env.PORT, () => {
        console.log(`🚀 HCM Lite server listening on http://localhost:${env_js_1.env.PORT}`);
        console.log(`🏥 Health check at http://localhost:${env_js_1.env.PORT}/api/health`);
    });
}
exports.default = app;
