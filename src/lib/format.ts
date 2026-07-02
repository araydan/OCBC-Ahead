export { money, moneyShort, pct, fmtDate, fmtDateTime, fmtTime, daysBetween } from '@shared/util';

/** Append an alpha channel to a hex colour, e.g. tint('#E30613', 0.1). */
export function tint(hex: string, alpha = 0.1): string {
  const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return `${hex}${a}`;
}

export function relativeTime(iso: string, now: string): string {
  const diff = (new Date(now).getTime() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
