export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

const NBSP = " ";

/** 23400 -> "23 400", 23456.7 -> "23 456,7" (с неразрывными пробелами и десятичной запятой) */
export function formatNumber(value: number, fractionDigits?: number): string {
  const fixed = fractionDigits !== undefined ? value.toFixed(fractionDigits) : String(value);
  const [int, frac] = fixed.split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return frac ? `${grouped},${frac}` : grouped;
}

/** 23400 -> "23 400 ₽" */
export function formatMoney(value: number, unit = "₽"): string {
  return `${formatNumber(value)}${NBSP}${unit}`;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** ISO -> "22.09.2026" */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/** ISO -> "22.09.2026, 11:42" */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${formatDate(iso)}, ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** ISO -> "11:42" */
export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** мс -> "7 мин 02 с" */
export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "—";
  const totalSec = Math.round(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h} ч ${pad2(m)} мин`;
  return `${m} мин ${pad2(s)} с`;
}

/** "2026-09-22" -> "22.09.2026" */
export function formatDay(date: string | null | undefined): string {
  if (!date) return "—";
  const [y, m, d] = date.split("-");
  if (!y || !m || !d) return "—";
  return `${d}.${m}.${y}`;
}

/** 0.734 -> "73" (проценты, округление) */
export function formatPercent(share: number): string {
  return String(Math.round(share * 100));
}
