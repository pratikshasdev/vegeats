import { formatTime, isWeeklyHours, openState, openStateLabel, weeklyRows, zonedNow } from '../hours';

const TZ = 'America/Detroit';
// 2026-10-28 is a Wednesday. Detroit is UTC-4 in late October (EDT).
const at = (localHHMM: string, day = '2026-10-28') => new Date(`${day}T${localHHMM}:00-04:00`);

const hours = {
  mon: [['11:00', '21:00']],
  tue: [['11:00', '21:00']],
  wed: [
    ['11:00', '14:00'],
    ['17:00', '22:00'],
  ],
  thu: [['11:00', '21:00']],
  fri: [['11:00', '02:00']],
  sat: [['10:00', '24:00']],
  sun: [],
};

describe('zonedNow', () => {
  it('converts to the restaurant timezone', () => {
    expect(zonedNow(at('13:15'), TZ)).toEqual({ day: 3, minutes: 13 * 60 + 15 });
  });
});

describe('openState', () => {
  it('is open inside a span', () => {
    expect(openState(hours, TZ, at('12:00'))).toEqual({ kind: 'open', closesAt: '14:00', closingSoon: false });
  });

  it('flags closing soon within 45 minutes', () => {
    expect(openState(hours, TZ, at('13:30'))).toMatchObject({ kind: 'open', closingSoon: true });
  });

  it('finds the next opening later the same day', () => {
    expect(openState(hours, TZ, at('15:00'))).toEqual({ kind: 'closed', opensAt: '17:00', opensDay: 'wed' });
  });

  it('finds the next opening on a later day', () => {
    expect(openState(hours, TZ, at('23:30'))).toEqual({ kind: 'closed', opensAt: '11:00', opensDay: 'thu' });
  });

  it('handles overnight spans that started yesterday', () => {
    // Saturday 01:00 is still inside Friday 11:00 → 02:00.
    expect(openState(hours, TZ, at('01:00', '2026-10-31'))).toMatchObject({ kind: 'open', closesAt: '02:00' });
  });

  it('skips closed days', () => {
    // Saturday 23:59 → closes at midnight; Sunday closed → opens Monday.
    expect(openState(hours, TZ, at('10:00', '2026-11-01'))).toEqual({ kind: 'closed', opensAt: '11:00', opensDay: 'mon' });
  });

  it('returns unknown for missing or malformed hours', () => {
    expect(openState(null, TZ)).toEqual({ kind: 'unknown' });
    expect(openState({ mon: 'all day' }, TZ)).toEqual({ kind: 'unknown' });
    expect(openState({ funday: [] }, TZ)).toEqual({ kind: 'unknown' });
  });
});

describe('labels', () => {
  it('formats times', () => {
    expect(formatTime('09:00')).toBe('9 AM');
    expect(formatTime('17:30')).toBe('5:30 PM');
    expect(formatTime('12:00')).toBe('12 PM');
    expect(formatTime('24:00')).toBe('midnight');
  });

  it('describes open and closed states', () => {
    expect(openStateLabel(openState(hours, TZ, at('12:00')), at('12:00'), TZ)).toBe('Open until 2 PM');
    expect(openStateLabel(openState(hours, TZ, at('15:00')), at('15:00'), TZ)).toBe('Closed. Opens at 5 PM');
    expect(openStateLabel(openState(hours, TZ, at('23:30')), at('23:30'), TZ)).toBe('Closed. Opens tomorrow at 11 AM');
    expect(openStateLabel({ kind: 'unknown' })).toBe('Hours not listed');
  });

  it('builds weekly rows Monday-first', () => {
    const rows = weeklyRows(hours);
    expect(rows[0]).toEqual({ day: 'mon', label: 'Monday', text: '11 AM – 9 PM' });
    expect(rows[2].text).toBe('11 AM – 2 PM, 5 PM – 10 PM');
    expect(rows[6]).toEqual({ day: 'sun', label: 'Sunday', text: 'Closed' });
    expect(weeklyRows({ mon: [['00:00', '24:00']] })[0].text).toBe('Open 24 hours');
  });

  it('validates the stored shape', () => {
    expect(isWeeklyHours(hours)).toBe(true);
    expect(isWeeklyHours([])).toBe(false);
    expect(isWeeklyHours({ mon: [['11:00']] })).toBe(false);
  });
});
