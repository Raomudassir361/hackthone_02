/**
 * Money calculations helper
 * Money: round to 2 decimals at the end of calculation only (not at each intermediate step);
 * never use string concatenation for money.
 */

export function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export const round2 = roundMoney;

export function formatPKR(amount: number): string {
  const rounded = roundMoney(amount);
  return `PKR ${rounded.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
