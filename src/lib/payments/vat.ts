/** SAR minor units (halalas) helpers for payment verification. */
export function toHalalas(sar: number): number {
  return Math.round(sar * 100);
}

export function fromHalalas(halalas: number): number {
  return halalas / 100;
}
