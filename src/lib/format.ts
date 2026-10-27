const METERS_PER_MILE = 1609.344;

/** US-facing distance: feet under 0.1 mi, otherwise miles with one decimal under 10. */
export function formatDistance(meters: number | null | undefined): string {
  if (meters == null || !Number.isFinite(meters)) return '';
  const miles = meters / METERS_PER_MILE;
  if (miles < 0.1) return `${Math.max(50, Math.round((meters * 3.28084) / 50) * 50)} ft`;
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

export function formatPriceLevel(level: number | null | undefined): string {
  return level && level >= 1 && level <= 4 ? '$'.repeat(level) : '';
}

export function formatPrice(cents: number | null | undefined): string {
  if (cents == null) return '';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

/** Parses "12.50" / "$12" / "12" into cents; returns null for empty input and NaN for invalid. */
export function parsePriceToCents(input: string): number | null {
  const cleaned = input.replace(/[$,\s]/g, '');
  if (!cleaned) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return NaN;
  return Math.round(Number(cleaned) * 100);
}

export function formatRating(avg: number | null | undefined): string {
  return avg ? Number(avg).toFixed(1) : '–';
}

export function pluralize(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function formatRelativeDate(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const days = Math.floor((now.getTime() - then.getTime()) / 86_400_000);
  if (days < 1) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return pluralize(Math.floor(days / 7), 'week') + ' ago';
  return then.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function fullAddress(r: { address_line: string; city: string; region: string; postal_code?: string | null }): string {
  return `${r.address_line}, ${r.city}, ${r.region}${r.postal_code ? ` ${r.postal_code}` : ''}`;
}
