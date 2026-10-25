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
    let mongoUri = uri || env_js_1.env.MONGODB_URI;
    // Auto-fallback: if MONGODB_URI still contains placeholder '<db_password>', use embedded Mongo in dev
    if (mongoUri.includes('<db_password>') || mongoUri.includes('<password>')) {
        console.warn('⚠️ MONGODB_URI contains placeholder <db_password>. Starting in-memory MongoDB for local development/demo...');
        try {
            const { MongoMemoryServer } = await import('mongodb-memory-server');
            const mongod = await MongoMemoryServer.create();
            mongoUri = mongod.getUri();
            console.log('✅ In-memory MongoDB started:', mongoUri);
        }
        catch (e) {
            console.error('Failed to start in-memory Mongo:', e);
        }
    }
    try {
        const conn = await mongoose_1.default.connect(mongoUri, {
            serverSelectionTimeoutMS: 5000,
        });
        console.log(`✅ MongoDB connected: ${conn.connection.host}`);
        return conn;
    }
    catch (error) {
        console.warn('⚠️ MongoDB connection warning (will retry with local in-memory instance):', error.message);
        try {
            const { MongoMemoryServer } = await import('mongodb-memory-server');
            const mongod = await MongoMemoryServer.create();
            const fallbackUri = mongod.getUri();
            const conn = await mongoose_1.default.connect(fallbackUri);
            console.log(`✅ In-memory MongoDB fallback connected: ${conn.connection.host}`);
            return conn;
        }
        catch (innerErr) {
            console.error('Failed in-memory fallback:', innerErr);
            return null;
        }
    }
}
async function disconnectDB() {
    await mongoose_1.default.disconnect();
}
