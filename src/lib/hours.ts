// Opening-hours helpers. Hours are stored per weekday in the restaurant's own
// timezone: {"mon":[["11:00","21:00"]], ...}. A span whose close <= open runs past midnight.

export type DayKey = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';
export type WeeklyHours = Partial<Record<DayKey, [string, string][]>>;

export const DAY_KEYS: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
export const DAY_LABELS: Record<DayKey, string> = {
  sun: 'Sunday',
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
};

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
};

export function isWeeklyHours(value: unknown): value is WeeklyHours {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.entries(value as Record<string, unknown>).every(
    ([k, v]) =>
      (DAY_KEYS as string[]).includes(k) &&
      Array.isArray(v) &&
      v.every((span) => Array.isArray(span) && span.length === 2 && span.every((s) => typeof s === 'string')),
  );
}

/** Local day index (0=Sun) and minutes since midnight for `date` in `timeZone`. */
export function zonedNow(date: Date, timeZone: string): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { day: day < 0 ? date.getDay() : day, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}

export type OpenState =
  | { kind: 'unknown' }
  | { kind: 'open'; closesAt: string; closingSoon: boolean }
  | { kind: 'closed'; opensAt: string | null; opensDay: DayKey | null };

const SOON_MINUTES = 45;

/** Determine whether the place is open at `now`, and the next relevant time. */
export function openState(hours: unknown, timeZone: string, now: Date = new Date()): OpenState {
  if (!isWeeklyHours(hours)) return { kind: 'unknown' };
  const { day, minutes } = zonedNow(now, timeZone);
  const today = DAY_KEYS[day];
  const yesterday = DAY_KEYS[(day + 6) % 7];

  // Yesterday's overnight spans that are still running.
  for (const [open, close] of hours[yesterday] ?? []) {
    const o = toMinutes(open);
    const c = toMinutes(close);
    if (c <= o && minutes < c) return { kind: 'open', closesAt: close, closingSoon: c - minutes <= SOON_MINUTES };
  }
  for (const [open, close] of hours[today] ?? []) {
    const o = toMinutes(open);
    const c = toMinutes(close);
    const overnight = c <= o;
    if (minutes >= o && (overnight || minutes < c)) {
      const remaining = overnight ? 24 * 60 - minutes + c : c - minutes;
      return { kind: 'open', closesAt: close, closingSoon: remaining <= SOON_MINUTES };
    }
  }
  // Next opening: later today, then the following days.
  const laterToday = (hours[today] ?? []).map(([o]) => o).filter((o) => toMinutes(o) > minutes).sort()[0];
  if (laterToday) return { kind: 'closed', opensAt: laterToday, opensDay: today };
  for (let i = 1; i <= 7; i++) {
    const d = DAY_KEYS[(day + i) % 7];
    const first = (hours[d] ?? []).map(([o]) => o).sort()[0];
    if (first) return { kind: 'closed', opensAt: first, opensDay: d };
  }
  return { kind: 'closed', opensAt: null, opensDay: null };
}

/** "17:30" -> "5:30 PM", "24:00" -> "midnight". */
export function formatTime(hhmm: string): string {
  const total = toMinutes(hhmm);
  if (total === 0 || total === 24 * 60) return 'midnight';
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function openStateLabel(state: OpenState, now: Date = new Date(), timeZone = 'America/Detroit'): string {
  switch (state.kind) {
    case 'unknown':
      return 'Hours not listed';
    case 'open':
      return state.closingSoon ? `Closes soon, at ${formatTime(state.closesAt)}` : `Open until ${formatTime(state.closesAt)}`;
    case 'closed': {
      if (!state.opensAt || !state.opensDay) return 'Closed';
      const todayKey = DAY_KEYS[zonedNow(now, timeZone).day];
      const tomorrowKey = DAY_KEYS[(DAY_KEYS.indexOf(todayKey) + 1) % 7];
      const when =
        state.opensDay === todayKey ? '' : state.opensDay === tomorrowKey ? ' tomorrow' : ` ${DAY_LABELS[state.opensDay]}`;
      return `Closed. Opens${when} at ${formatTime(state.opensAt)}`;
    }
  }
}

/** Rows for a weekly schedule, Monday first. */
export function weeklyRows(hours: unknown): { day: DayKey; label: string; text: string }[] {
  if (!isWeeklyHours(hours)) return [];
  const order: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  return order.map((day) => {
    const spans = hours[day] ?? [];
    const text = spans.length
      ? spans
          .map(([o, c]) => (o === '00:00' && c === '24:00' ? 'Open 24 hours' : `${formatTime(o)} – ${formatTime(c)}`))
          .join(', ')
      : 'Closed';
    return { day, label: DAY_LABELS[day], text };
  });
}
