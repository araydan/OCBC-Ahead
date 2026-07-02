// Shared helpers used by BOTH the offline frontend engine and the server.
// Keep this file dependency-free and DOM-free so Node can import it too.
import type { Currency } from './types';

let counter = 0;
/** Short, readable, collision-resistant id. */
export const uid = (prefix = 'id'): string =>
  `${prefix}_${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const SYMBOL: Record<Currency, string> = { SGD: 'S$', USD: 'US$', JPY: '¥' };

/** Format money the way a Singaporean banking app would. */
export function money(n: number, currency: Currency = 'SGD'): string {
  const sign = n < 0 ? '-' : '';
  const fracte = currency === 'JPY' ? 0 : 2;
  const abs = Math.abs(n).toLocaleString('en-SG', {
    minimumFractionDigits: fracte,
    maximumFractionDigits: fracte,
  });
  return `${sign}${SYMBOL[currency]}${abs}`;
}

/** Compact money, e.g. S$22k — for tight UI chips. */
export function moneyShort(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1000) return `S$${(n / 1000).toFixed(abs % 1000 === 0 ? 0 : 1)}k`;
  return money(n);
}

export const pct = (ratio: number, dp = 2): string => `${(ratio * 100).toFixed(dp)}%`;

export function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' });
}

export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-SG', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));
