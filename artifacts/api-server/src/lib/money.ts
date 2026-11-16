import { Problem } from "./problem";

export function toFils(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0 || amount > 999999.999) {
    throw new Problem(400, "Amount must be between 0.001 and 999999.999 KWD.");
  }
  const fils = Math.round(amount * 1000);
  if (Math.abs(amount * 1000 - fils) > 0.00001) {
    throw new Problem(400, "KWD amounts must have no more than three decimal places.");
  }
  return fils;
}
export function normalizedReference(ref: string): string {
  return ref.normalize("NFKC").toUpperCase().replace(/[^\p{L}\p{N}]/gu, "");
}
export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
