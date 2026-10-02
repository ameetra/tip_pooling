import type { BillField } from '../types';

export const BILLS: [BillField, number][] = [
  ['bills100', 100], ['bills50', 50], ['bills20', 20], ['bills10', 10], ['bills5', 5], ['bills2', 2], ['bills1', 1],
];

// Whole cents, so sums of dollar amounts don't drift.
export const cents = (n: number) => Math.round(n * 100);

export const money = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(n).toFixed(2)}`;

export const signedMoney = (n: number) => (n > 0 ? `+${money(n)}` : money(n));
