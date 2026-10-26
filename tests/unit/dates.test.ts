import { describe, expect, it } from 'vitest';
import { addDays, formatDue, isISODate, isOverdue, toISODate } from '../../src/dates';

describe('dates', () => {
  it('formats local dates, not UTC', () => {
    expect(toISODate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('validates real calendar dates only', () => {
    expect(isISODate('2026-02-28')).toBe(true);
    expect(isISODate('2024-02-29')).toBe(true);
    expect(isISODate('2026-02-30')).toBe(false);
    expect(isISODate('2026-2-3')).toBe(false);
    expect(isISODate(20260101)).toBe(false);
  });

  it('adds days across month and year ends', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('marks only unfinished past-due tasks as overdue', () => {
    expect(isOverdue({ done: false, due: '2026-10-25' }, '2026-10-26')).toBe(true);
    expect(isOverdue({ done: false, due: '2026-10-26' }, '2026-10-26')).toBe(false);
    expect(isOverdue({ done: true, due: '2026-10-25' }, '2026-10-26')).toBe(false);
    expect(isOverdue({ done: false, due: null }, '2026-10-26')).toBe(false);
  });

  it('uses friendly words near today and adds the year only when it differs', () => {
    const today = '2026-10-26';
    expect(formatDue('2026-10-26', today)).toBe('Today');
    expect(formatDue('2026-10-27', today)).toBe('Tomorrow');
    expect(formatDue('2026-10-25', today)).toBe('Yesterday');
    expect(formatDue('2026-11-15', today, 'en-GB')).toBe('15 Nov');
    expect(formatDue('2027-01-15', today, 'en-GB')).toBe('15 Jan 2027');
  });
});
