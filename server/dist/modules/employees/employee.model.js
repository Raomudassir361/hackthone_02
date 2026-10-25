"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CounterModel = exports.EmployeeModel = void 0;
exports.getNextSequence = getNextSequence;
const mongoose_1 = __importStar(require("mongoose"));
const employeeSchema = new mongoose_1.Schema({
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    departmentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Department' },
    designationId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Designation' },
    joinDate: { type: String, required: true },
    exitDate: { type: String },
    status: { type: String, enum: ['probation', 'active', 'exited', 'inactive'], default: 'active' },
    basicSalary: { type: Number, required: true, min: 0 },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
}, {
    timestamps: true,
});
employeeSchema.index({ name: 'text', email: 'text', code: 'text' });
exports.EmployeeModel = mongoose_1.default.model('Employee', employeeSchema, 'employees');
exports.CounterModel = mongoose_1.default.model('Counter', new mongoose_1.Schema({
    key: { type: String, required: true, unique: true },
    seq: { type: Number, default: 0 },
}), 'counters');
async function getNextSequence(key) {
    const counter = await exports.CounterModel.findOneAndUpdate({ key }, { $inc: { seq: 1 } }, { new: true, upsert: true });
    return counter.seq;
}
