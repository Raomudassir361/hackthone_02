"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = connectDB;
exports.disconnectDB = disconnectDB;
const mongoose_1 = __importDefault(require("mongoose"));
const env_js_1 = require("./env.js");
async function connectDB(uri) {
    const mongoUri = uri || env_js_1.env.MONGODB_URI;
    try {
        const conn = await mongoose_1.default.connect(mongoUri, {
            serverSelectionTimeoutMS: 3000,
        });
        console.log(`✅ MongoDB connected: ${conn.connection.host}`);
        return conn;
    }
    catch (error) {
        console.warn('⚠️ MongoDB connection warning (will retry on incoming requests or when DB is started):', error.message);
        return null;
    }
}
async function disconnectDB() {
    await mongoose_1.default.disconnect();
}
