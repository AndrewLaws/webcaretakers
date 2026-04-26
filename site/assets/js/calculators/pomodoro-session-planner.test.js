const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  calculatePomodoroPlan,
  sessionsNeeded,
  totalElapsedMinutes,
  splitAcrossDays,
  finishTime,
  realismCheck,
} = require('./pomodoro-session-planner.js');

// --- sessionsNeeded ---

test('sessionsNeeded: 100 minutes at 25-minute sessions = 4 sessions', () => {
  assert.equal(sessionsNeeded({ totalFocusMinutes: 100, sessionLength: 25 }), 4);
});

test('sessionsNeeded: rounds up partial sessions', () => {
  assert.equal(sessionsNeeded({ totalFocusMinutes: 110, sessionLength: 25 }), 5);
});

test('sessionsNeeded: throws on zero focus minutes', () => {
  assert.throws(() => sessionsNeeded({ totalFocusMinutes: 0, sessionLength: 25 }));
});

// --- totalElapsedMinutes ---

test('totalElapsedMinutes: 1 session has no trailing break', () => {
  const t = totalElapsedMinutes({ sessions: 1, sessionLength: 25, shortBreak: 5, longBreak: 15 });
  assert.equal(t, 25);
});

test('totalElapsedMinutes: 4 sessions = 25*4 + 5*3 (no trailing long break)', () => {
  const t = totalElapsedMinutes({ sessions: 4, sessionLength: 25, shortBreak: 5, longBreak: 15 });
  assert.equal(t, 25 * 4 + 5 * 3);
});

test('totalElapsedMinutes: 5 sessions includes one long break after the 4th', () => {
  const t = totalElapsedMinutes({ sessions: 5, sessionLength: 25, shortBreak: 5, longBreak: 15 });
  // 25 + 5 + 25 + 5 + 25 + 5 + 25 + 15 + 25 = 155
  assert.equal(t, 155);
});

test('totalElapsedMinutes: 8 sessions has long break after 4th but not 8th', () => {
  const t = totalElapsedMinutes({ sessions: 8, sessionLength: 25, shortBreak: 5, longBreak: 15 });
  // 8 sessions = 200 focus, 7 breaks: 3 short, 1 long, 3 short = 15+15+15 = 45
  assert.equal(t, 200 + 45);
});

// --- splitAcrossDays ---

test('splitAcrossDays: 6 sessions of 25 min with 5h cap fits in one day', () => {
  const days = splitAcrossDays({
    sessions: 6, sessionLength: 25, shortBreak: 5, longBreak: 15, dailyFocusCapMinutes: 300,
  });
  assert.equal(days.length, 1);
  assert.equal(days[0].sessions, 6);
});

test('splitAcrossDays: 20 sessions of 25 min with 5h cap spans multiple days', () => {
  const days = splitAcrossDays({
    sessions: 20, sessionLength: 25, shortBreak: 5, longBreak: 15, dailyFocusCapMinutes: 300,
  });
  // 5h / 25 min = 12 sessions per day, so 20 = 12 + 8
  assert.equal(days.length, 2);
  assert.equal(days[0].sessions, 12);
  assert.equal(days[1].sessions, 8);
});

// --- finishTime ---

test('finishTime: 09:00 + 90 min = 10:30', () => {
  assert.deepEqual(finishTime({ startTime: '09:00', addMinutes: 90 }), { time: '10:30', daysAdded: 0 });
});

test('finishTime: crosses midnight', () => {
  const r = finishTime({ startTime: '23:30', addMinutes: 60 });
  assert.equal(r.time, '00:30');
  assert.equal(r.daysAdded, 1);
});

test('finishTime: rejects bad input', () => {
  assert.throws(() => finishTime({ startTime: 'noon', addMinutes: 30 }));
});

// --- realismCheck ---

test('realismCheck: in-cap returns ok', () => {
  const r = realismCheck({ totalFocusMinutes: 120, dailyFocusCapMinutes: 300 });
  assert.equal(r.level, 'ok');
});

test('realismCheck: cap above 5h flags warning', () => {
  const r = realismCheck({ totalFocusMinutes: 120, dailyFocusCapMinutes: 480 });
  assert.equal(r.level, 'warning');
});

// --- calculatePomodoroPlan integration ---

test('calculatePomodoroPlan: defaults give a sensible shape', () => {
  const r = calculatePomodoroPlan({ totalFocusMinutes: 100 });
  assert.equal(r.sessions, 4);
  assert.equal(r.totalFocusMinutes, 100);
  assert.equal(r.totalBreakMinutes, 15);
  assert.equal(r.totalElapsedMinutes, 115);
  assert.equal(r.dayCount, 1);
  assert.equal(r.finish, null);
});

test('calculatePomodoroPlan: with startTime returns a finish time', () => {
  const r = calculatePomodoroPlan({ totalFocusMinutes: 50, startTime: '09:00' });
  // 2 sessions, 25+5+25 = 55 minutes
  assert.equal(r.sessions, 2);
  assert.equal(r.totalElapsedMinutes, 55);
  assert.equal(r.finish.time, '09:55');
});

test('calculatePomodoroPlan: long task spans multiple days', () => {
  const r = calculatePomodoroPlan({ totalFocusMinutes: 600, dailyFocusCapMinutes: 300 });
  assert.ok(r.dayCount >= 2);
  assert.equal(r.sessions, 24);
});
