// Pomodoro Session Planner: pure-logic helpers.
//
// The user gives us a chunk of work to do (in minutes), a session config,
// and an optional daily focus cap. We work out how many Pomodoro sessions
// they need, how much wall-clock time that comes to once breaks are added,
// when they will finish, and how it splits across days when one day is not
// enough.

function assertPositive(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error(name + ' must be a positive number');
  }
}

function assertNonNegative(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(name + ' must be zero or positive');
  }
}

// How many full sessions are needed to cover the requested focus time.
// We round up: half a session still costs you a whole session of clock time,
// because that is how Pomodoros work in the real world.
function sessionsNeeded({ totalFocusMinutes, sessionLength }) {
  assertPositive(totalFocusMinutes, 'totalFocusMinutes');
  assertPositive(sessionLength, 'sessionLength');
  return Math.ceil(totalFocusMinutes / sessionLength);
}

// Total elapsed wall-clock minutes for N sessions, including short breaks
// after every session and a long break after every Nth session (default 4).
// We do not add a trailing break after the final session because you are
// done. The break exists to recover for the next session, and there isn't
// one.
function totalElapsedMinutes({
  sessions,
  sessionLength,
  shortBreak,
  longBreak,
  longBreakEvery = 4,
}) {
  assertPositive(sessions, 'sessions');
  assertPositive(sessionLength, 'sessionLength');
  assertNonNegative(shortBreak, 'shortBreak');
  assertNonNegative(longBreak, 'longBreak');
  assertPositive(longBreakEvery, 'longBreakEvery');

  let total = 0;
  for (let i = 1; i <= sessions; i += 1) {
    total += sessionLength;
    if (i === sessions) break; // no trailing break
    if (i % longBreakEvery === 0) {
      total += longBreak;
    } else {
      total += shortBreak;
    }
  }
  return total;
}

// Split sessions across days, respecting a daily focus-minute cap. Each day
// holds as many full sessions as fit under the cap. Returns an array of
// per-day plans: how many sessions, focus minutes, elapsed minutes (with
// breaks). The final day may be shorter than the cap.
function splitAcrossDays({
  sessions,
  sessionLength,
  shortBreak,
  longBreak,
  longBreakEvery = 4,
  dailyFocusCapMinutes,
}) {
  assertPositive(sessions, 'sessions');
  assertPositive(sessionLength, 'sessionLength');
  assertPositive(dailyFocusCapMinutes, 'dailyFocusCapMinutes');

  const sessionsPerDay = Math.max(1, Math.floor(dailyFocusCapMinutes / sessionLength));
  const days = [];
  let remaining = sessions;
  while (remaining > 0) {
    const today = Math.min(sessionsPerDay, remaining);
    const focusMinutes = today * sessionLength;
    const elapsed = totalElapsedMinutes({
      sessions: today,
      sessionLength,
      shortBreak,
      longBreak,
      longBreakEvery,
    });
    days.push({
      sessions: today,
      focusMinutes,
      elapsedMinutes: elapsed,
    });
    remaining -= today;
  }
  return days;
}

// Add minutes to an HH:MM start time. Returns { time: 'HH:MM', daysAdded: N }
// where daysAdded counts how many midnights we crossed. Pure function, no
// Date instances involved.
function finishTime({ startTime, addMinutes }) {
  if (typeof startTime !== 'string' || !/^\d{1,2}:\d{2}$/.test(startTime)) {
    throw new Error('startTime must be HH:MM');
  }
  assertNonNegative(addMinutes, 'addMinutes');
  const [hStr, mStr] = startTime.split(':');
  const startMinutes = parseInt(hStr, 10) * 60 + parseInt(mStr, 10);
  if (parseInt(hStr, 10) > 23 || parseInt(mStr, 10) > 59) {
    throw new Error('startTime out of range');
  }
  const total = startMinutes + Math.round(addMinutes);
  const daysAdded = Math.floor(total / (24 * 60));
  const dayMinutes = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(dayMinutes / 60);
  const m = dayMinutes % 60;
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  return { time: pad(h) + ':' + pad(m), daysAdded };
}

// The honest "is this realistic?" check. The research on sustained
// cognitive focus (Cal Newport, Ericsson on deliberate practice, the
// general consensus across the productivity literature) lands somewhere
// between three and five hours of genuine focused work per day for most
// people. Anything beyond that for one day, we flag.
function realismCheck({ totalFocusMinutes, dailyFocusCapMinutes }) {
  const cap = dailyFocusCapMinutes;
  const REALISTIC_CEILING_MINUTES = 5 * 60;
  const focusHours = totalFocusMinutes / 60;
  if (cap > REALISTIC_CEILING_MINUTES) {
    return {
      level: 'warning',
      message:
        'A daily cap of more than 5 hours of pure focus is ambitious. Most people land between 3 and 5 hours of real, focused work per day. Consider lowering the cap and letting it run across more days.',
    };
  }
  if (totalFocusMinutes <= cap) {
    return {
      level: 'ok',
      message: 'This fits inside one day at your chosen daily focus cap.',
    };
  }
  if (focusHours > 8) {
    return {
      level: 'warning',
      message:
        'You are looking at more than 8 hours of focus. That is a serious amount of deep work. The plan splits it across multiple days, which is the honest answer.',
    };
  }
  return {
    level: 'info',
    message:
      'This is more than fits in a single day at your daily cap, so the plan spreads it across multiple days. That is normal.',
  };
}

function calculatePomodoroPlan({
  totalFocusMinutes,
  sessionLength = 25,
  shortBreak = 5,
  longBreak = 15,
  longBreakEvery = 4,
  dailyFocusCapMinutes = 5 * 60,
  startTime,
}) {
  assertPositive(totalFocusMinutes, 'totalFocusMinutes');
  assertPositive(sessionLength, 'sessionLength');
  assertNonNegative(shortBreak, 'shortBreak');
  assertNonNegative(longBreak, 'longBreak');
  assertPositive(longBreakEvery, 'longBreakEvery');
  assertPositive(dailyFocusCapMinutes, 'dailyFocusCapMinutes');

  const sessions = sessionsNeeded({ totalFocusMinutes, sessionLength });
  const elapsed = totalElapsedMinutes({
    sessions,
    sessionLength,
    shortBreak,
    longBreak,
    longBreakEvery,
  });
  const totalFocus = sessions * sessionLength;
  const totalBreak = elapsed - totalFocus;

  const days = splitAcrossDays({
    sessions,
    sessionLength,
    shortBreak,
    longBreak,
    longBreakEvery,
    dailyFocusCapMinutes,
  });

  let finish = null;
  if (startTime) {
    // Finish time today is based on the first day's elapsed minutes if the
    // plan spans multiple days, otherwise the whole elapsed time.
    const todayElapsed = days[0].elapsedMinutes;
    finish = finishTime({ startTime, addMinutes: todayElapsed });
    finish.spansToNextDay = finish.daysAdded > 0;
  }

  const realism = realismCheck({ totalFocusMinutes, dailyFocusCapMinutes });

  return {
    sessions,
    sessionLength,
    shortBreak,
    longBreak,
    longBreakEvery,
    totalFocusMinutes: totalFocus,
    totalBreakMinutes: totalBreak,
    totalElapsedMinutes: elapsed,
    days,
    dayCount: days.length,
    finish,
    realism,
  };
}

const exported = {
  calculatePomodoroPlan,
  sessionsNeeded,
  totalElapsedMinutes,
  splitAcrossDays,
  finishTime,
  realismCheck,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exported;
}
if (typeof window !== 'undefined') {
  window.PomodoroPlanner = exported;
}
