export function fmtAmount(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

export function fmtDate(iso: string | null | undefined, locale: string, withTime = false): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    numberingSystem: "latn",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function errMsg(e: unknown, fallback: string): string {
  if (!e) return fallback;
  const anyE = e as { data?: unknown; message?: string };
  const d = anyE.data as { error?: string; message?: string } | string | undefined;
  if (typeof d === "string" && d.trim()) return d;
  if (d && typeof d === "object") {
    if (typeof d.error === "string") return d.error;
    if (typeof d.message === "string") return d.message;
  }
  return anyE.message || fallback;
}

export const AMOUNT_RE = /^\d{1,6}(\.\d{1,3})?$/;
