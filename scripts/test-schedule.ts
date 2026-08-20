// Verifies the recurring order-window scanner across the week and across
// both DST regimes. Run: npx tsx scripts/test-schedule.ts
// No database required — nextWindowFromSchedule is pure.
import { nextWindowFromSchedule } from '../lib/store';
import type { ScheduleEntry } from '../lib/types';

// The default: open Sunday 8AM CST, close Thursday 8PM CST.
const SCHEDULE: ScheduleEntry[] = [
  { day: 0, open: '08:00', close: '23:59' },
  { day: 4, open: '00:00', close: '20:00' },
];

const inChicago = (d: Date) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'short', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(d);

let failures = 0;

function check(label: string, nowIso: string, expectOpen: boolean) {
  const now = new Date(nowIso);
  const win = nextWindowFromSchedule(SCHEDULE, now);
  if (!win) {
    console.log(`FAIL  ${label}: got null window`);
    failures++;
    return;
  }
  const isOpen = now >= win.opensAt && now < win.closesAt;
  const ok = isOpen === expectOpen;
  if (!ok) failures++;
  console.log(
    `${ok ? 'ok  ' : 'FAIL'}  ${label.padEnd(34)} now=${inChicago(now)}  ` +
      `opens=${inChicago(win.opensAt)}  closes=${inChicago(win.closesAt)}  ` +
      `open=${isOpen} (expected ${expectOpen})`
  );
}

// --- Summer / CDT (UTC-5). Aug 2026: Sun 16th … Sat 22nd -------------
console.log('\n--- CDT (summer) ---');
check('Sun 07:00 before open',   '2026-08-16T12:00:00Z', false); // 07:00 CDT
check('Sun 09:00 after open',    '2026-08-16T14:00:00Z', true);  // 09:00 CDT
check('Mon midday (mid-span)',   '2026-08-17T17:00:00Z', true);
check('Tue midday (mid-span)',   '2026-08-18T17:00:00Z', true);
check('Wed midday (mid-span)',   '2026-08-19T17:00:00Z', true);
check('Thu 14:00 before close',  '2026-08-20T19:00:00Z', true);  // 14:00 CDT
check('Thu 21:00 after close',   '2026-08-21T02:00:00Z', false); // 21:00 CDT Thu
check('Fri midday (closed)',     '2026-08-21T17:00:00Z', false);
check('Sat midday (closed)',     '2026-08-22T17:00:00Z', false);

// --- Winter / CST (UTC-6). Jan 2027: Sun 10th … Sat 16th -------------
// These are the cases the old host-clock DST check got wrong.
console.log('\n--- CST (winter) ---');
check('Sun 07:00 before open',   '2027-01-10T13:00:00Z', false); // 07:00 CST
check('Sun 09:00 after open',    '2027-01-10T15:00:00Z', true);  // 09:00 CST
check('Sun 07:30 (hour-off trap)','2027-01-10T13:30:00Z', false); // 07:30 CST
check('Tue midday (mid-span)',   '2027-01-12T18:00:00Z', true);
check('Thu 19:30 before close',  '2027-01-15T01:30:00Z', true);  // 19:30 CST Thu
check('Thu 20:30 after close',   '2027-01-15T02:30:00Z', false); // 20:30 CST Thu
check('Sat midday (closed)',     '2027-01-16T18:00:00Z', false);

// --- Boundary: near midnight, spring-forward week ---------------------
// DST begins Sun 8 Mar 2026. Day arithmetic must not slip a date here.
console.log('\n--- DST transition week (Mar 2026) ---');
check('Sat 23:30 before window', '2026-03-08T05:30:00Z', false); // 23:30 CST Sat
check('Sun 09:00 after open',    '2026-03-08T14:00:00Z', true);  // 09:00 CDT
check('Wed 00:30 (mid-span)',    '2026-03-11T05:30:00Z', true);  // 00:30 CDT

// --- Empty schedule falls through ------------------------------------
console.log('\n--- Empty schedule ---');
console.log(
  nextWindowFromSchedule([], new Date()) === null
    ? 'ok    empty schedule returns null'
    : (failures++, 'FAIL  empty schedule should return null')
);

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
