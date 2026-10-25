"use strict";
/**
 * Money calculations helper
 * Money: round to 2 decimals at the end of calculation only (not at each intermediate step);
 * never use string concatenation for money.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.round2 = void 0;
exports.roundMoney = roundMoney;
exports.formatPKR = formatPKR;
function roundMoney(amount) {
    return Math.round((amount + Number.EPSILON) * 100) / 100;
}
exports.round2 = roundMoney;
function formatPKR(amount) {
    const rounded = roundMoney(amount);
    return `PKR ${rounded.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
