import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';

export function dateFromISO(value: string): Date {
  return parseISO(value);
}

export function formatISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function daysInPeriod(startDate: Date, endDate: Date): number {
  return Math.max(1, differenceInCalendarDays(endDate, startDate) + 1);
}

export function weeksInPeriod(startDate: Date, endDate: Date): number {
  return Math.max(1, Math.ceil(daysInPeriod(startDate, endDate) / 7));
}

export function daysPassedInPeriod(startDate: Date, today = new Date()): number {
  return Math.max(0, differenceInCalendarDays(today, startDate) + 1);
}

export function daysRemainingInPeriod(endDate: Date, today = new Date()): number {
  return Math.max(0, differenceInCalendarDays(endDate, today));
}

export function getCurrentWeekNumber(startDate: Date, endDate: Date, today = new Date()): number {
  const weeksTotal = weeksInPeriod(startDate, endDate);
  const elapsedDays = Math.max(0, differenceInCalendarDays(today, startDate));
  return Math.min(Math.floor(elapsedDays / 7) + 1, weeksTotal);
}

export function endDateForWeeks(startDate: Date, weeks: number): Date {
  return addDays(startDate, Math.max(1, weeks) * 7 - 1);
}

export function periodPercentComplete(startDate: Date, endDate: Date, today = new Date()): number {
  const total = daysInPeriod(startDate, endDate);
  const passed = Math.min(total, daysPassedInPeriod(startDate, today));
  return Math.max(0, Math.min(100, Math.round((passed / total) * 100)));
}
