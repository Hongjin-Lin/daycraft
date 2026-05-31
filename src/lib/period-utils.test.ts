import assert from 'node:assert/strict';
import {
  dateFromISO,
  daysInPeriod,
  daysRemainingInPeriod,
  formatISODate,
  getCurrentWeekNumber,
  weeksInPeriod,
} from './period-utils';

const start = dateFromISO('2026-05-30');
const end = dateFromISO('2026-07-10');

assert.equal(formatISODate(start), '2026-05-30');
assert.equal(daysInPeriod(start, end), 42);
assert.equal(weeksInPeriod(start, end), 6);
assert.equal(daysRemainingInPeriod(end, dateFromISO('2026-05-31')), 40);
assert.equal(getCurrentWeekNumber(start, end, dateFromISO('2026-06-06')), 2);
assert.equal(getCurrentWeekNumber(start, end, dateFromISO('2026-09-01')), 6);

console.log('period-utils tests passed');
