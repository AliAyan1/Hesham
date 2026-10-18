export function calculateVAT(amount: number, vatPercentage = 15): {
  base: number;
  vat: number;
  total: number;
} {
  const rate = vatPercentage / 100;
  const vat = Math.round(amount * rate * 100) / 100;
  const total = Math.round((amount + vat) * 100) / 100;
  return { base: amount, vat, total };
}

export function toHalalas(sar: number): number {
  return Math.round(sar * 100);
}

export function fromHalalas(halalas: number): number {
  return halalas / 100;
}
