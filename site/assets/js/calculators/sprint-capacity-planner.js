// Sprint Capacity Planner. Browser-only, no network calls.
//
// Maths reference (per person):
//   workingDays   = max(sprintDays - holidayDays, 0)
//   rawHours      = workingDays * hoursPerDay
//   afterFocus    = rawHours * focusFactor                     // 0..1
//   afterMeetings = afterFocus * (1 - ceremoniesPercent / 100) // 0..100
//
// Team:
//   totalHours    = sum of person-hours
//   totalDays     = totalHours / hoursPerDay
//   forecastPts   = totalDays * velocity                       // story points / person-day
//   confidence    = forecastPts * (1 ± confidenceBand)
//
// Velocity is supplied as a rolling 3-sprint average story points per person
// per day. Default 0.6 (a typical figure for a team writing reasonably small
// stories). Confidence band defaults to ±20%.

'use strict';

const DEFAULT_SPRINT_DAYS = 10;
const DEFAULT_HOURS_PER_DAY = 6;
const DEFAULT_FOCUS_FACTOR = 0.7;
const DEFAULT_VELOCITY = 0.6;
const DEFAULT_CONFIDENCE_BAND = 0.2;

function personHours({ sprintDays, hoursPerDay, holidayDays, ceremoniesPercent, focusFactor }) {
  if (!Number.isFinite(sprintDays) || sprintDays <= 0) {
    throw new Error('personHours: sprintDays must be positive');
  }
  if (!Number.isFinite(hoursPerDay) || hoursPerDay <= 0) {
    throw new Error('personHours: hoursPerDay must be positive');
  }
  if (!Number.isFinite(holidayDays) || holidayDays < 0) {
    throw new Error('personHours: holidayDays must be zero or positive');
  }
  if (!Number.isFinite(ceremoniesPercent) || ceremoniesPercent < 0 || ceremoniesPercent > 100) {
    throw new Error('personHours: ceremoniesPercent must be between 0 and 100');
  }
  if (!Number.isFinite(focusFactor) || focusFactor < 0 || focusFactor > 1) {
    throw new Error('personHours: focusFactor must be between 0 and 1');
  }
  const workingDays = Math.max(sprintDays - holidayDays, 0);
  const raw = workingDays * hoursPerDay;
  const afterFocus = raw * focusFactor;
  const afterMeetings = afterFocus * (1 - ceremoniesPercent / 100);
  return afterMeetings;
}

function personDays(hours, hoursPerDay) {
  if (!Number.isFinite(hoursPerDay) || hoursPerDay <= 0) {
    throw new Error('personDays: hoursPerDay must be positive');
  }
  if (!Number.isFinite(hours) || hours < 0) {
    throw new Error('personDays: hours must be zero or positive');
  }
  return hours / hoursPerDay;
}

function forecastStoryPoints(days, velocity) {
  return days * velocity;
}

function confidenceBand(value, band) {
  return {
    low: value * (1 - band),
    high: value * (1 + band),
  };
}

// teamCapacity: top-level entry point used by the page.
// Returns { rows, totalHours, totalDays, forecastPoints, lowPoints, highPoints }.
function teamCapacity({ sprintDays, hoursPerDay, velocity, confidenceBand: band, people }) {
  if (!Array.isArray(people) || people.length === 0) {
    throw new Error('teamCapacity: people must be a non-empty array (need at least one team member)');
  }
  if (!Number.isFinite(sprintDays) || sprintDays <= 0) {
    throw new Error('teamCapacity: sprintDays must be positive');
  }
  if (!Number.isFinite(hoursPerDay) || hoursPerDay <= 0) {
    throw new Error('teamCapacity: hoursPerDay must be positive');
  }
  if (!Number.isFinite(velocity) || velocity < 0) {
    throw new Error('teamCapacity: velocity must be zero or positive');
  }
  if (!Number.isFinite(band) || band < 0) {
    throw new Error('teamCapacity: confidenceBand must be zero or positive');
  }

  const rows = people.map(function (p, i) {
    const hours = personHours({
      sprintDays: sprintDays,
      hoursPerDay: hoursPerDay,
      holidayDays: p.holidayDays,
      ceremoniesPercent: p.ceremoniesPercent,
      focusFactor: p.focusFactor,
    });
    const days = personDays(hours, hoursPerDay);
    const points = forecastStoryPoints(days, velocity);
    return {
      name: (p.name && String(p.name).trim()) || ('Person ' + (i + 1)),
      holidayDays: p.holidayDays,
      ceremoniesPercent: p.ceremoniesPercent,
      focusFactor: p.focusFactor,
      hours: hours,
      days: days,
      points: points,
    };
  });

  const totalHours = rows.reduce(function (acc, r) { return acc + r.hours; }, 0);
  const totalDays = personDays(totalHours, hoursPerDay);
  const forecastPoints = forecastStoryPoints(totalDays, velocity);
  const cb = confidenceBand(forecastPoints, band);

  return {
    rows: rows,
    totalHours: totalHours,
    totalDays: totalDays,
    forecastPoints: forecastPoints,
    lowPoints: cb.low,
    highPoints: cb.high,
  };
}

const exported = {
  DEFAULT_SPRINT_DAYS,
  DEFAULT_HOURS_PER_DAY,
  DEFAULT_FOCUS_FACTOR,
  DEFAULT_VELOCITY,
  DEFAULT_CONFIDENCE_BAND,
  personHours,
  personDays,
  forecastStoryPoints,
  confidenceBand,
  teamCapacity,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exported;
}
if (typeof window !== 'undefined') {
  window.SprintCapacityPlanner = exported;
}

// ── Browser wiring ────────────────────────────────────────────────────────
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('sprint-capacity-form');
    if (!form) return;

    var sprintDaysInput = form.querySelector('[data-sprint-days]');
    var hoursPerDayInput = form.querySelector('[data-hours-per-day]');
    var velocityInput = form.querySelector('[data-velocity]');
    var bandInput = form.querySelector('[data-confidence-band]');
    var peopleBody = form.querySelector('[data-people-body]');
    var addPersonBtn = form.querySelector('[data-add-person]');
    var calculateBtn = form.querySelector('[data-calculate]');
    var rowTemplate = document.getElementById('person-row-template');

    var resultHours = document.querySelector('[data-result-hours]');
    var resultDays = document.querySelector('[data-result-days]');
    var resultPoints = document.querySelector('[data-result-points]');
    var resultBand = document.querySelector('[data-result-band]');
    var breakdownBody = document.querySelector('[data-breakdown-body]');
    var workingsList = document.querySelector('[data-workings]');
    var errorEl = document.querySelector('[data-error]');

    var firstInteractionFired = false;

    function fireInteractionOnce(field) {
      if (firstInteractionFired) return;
      firstInteractionFired = true;
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'calculator_interaction',
        calculator_name: 'Sprint Capacity Planner',
        field: field || null,
      });
    }

    function fireResult(payload) {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(Object.assign({
        event: 'calculator_result',
        calculator_name: 'Sprint Capacity Planner',
      }, payload));
    }

    function addPersonRow(values) {
      values = values || {};
      if (!rowTemplate) return;
      var clone = rowTemplate.content.firstElementChild.cloneNode(true);
      if (values.name !== undefined) clone.querySelector('[data-row-name]').value = values.name;
      if (values.holidayDays !== undefined) clone.querySelector('[data-row-holiday]').value = values.holidayDays;
      if (values.ceremoniesPercent !== undefined) clone.querySelector('[data-row-ceremonies]').value = values.ceremoniesPercent;
      if (values.focusFactor !== undefined) clone.querySelector('[data-row-focus]').value = values.focusFactor;
      var removeBtn = clone.querySelector('[data-row-remove]');
      removeBtn.addEventListener('click', function () {
        var rows = peopleBody.querySelectorAll('[data-person-row]');
        if (rows.length <= 1) return; // keep at least one row
        clone.remove();
      });
      peopleBody.appendChild(clone);
    }

    if (addPersonBtn) {
      addPersonBtn.addEventListener('click', function () {
        fireInteractionOnce('add-person');
        addPersonRow({ holidayDays: 0, ceremoniesPercent: 10, focusFactor: 70 });
      });
    }

    // Seed three rows so the user sees the shape immediately.
    addPersonRow({ name: 'Alex', holidayDays: 0, ceremoniesPercent: 10, focusFactor: 70 });
    addPersonRow({ name: 'Bel',  holidayDays: 2, ceremoniesPercent: 10, focusFactor: 70 });
    addPersonRow({ name: 'Cam',  holidayDays: 0, ceremoniesPercent: 15, focusFactor: 65 });

    function readPeople() {
      var people = [];
      peopleBody.querySelectorAll('[data-person-row]').forEach(function (row) {
        var name = row.querySelector('[data-row-name]').value || '';
        var holiday = parseFloat(row.querySelector('[data-row-holiday]').value);
        var ceremonies = parseFloat(row.querySelector('[data-row-ceremonies]').value);
        var focus = parseFloat(row.querySelector('[data-row-focus]').value);
        if (!Number.isFinite(holiday) || holiday < 0) holiday = 0;
        if (!Number.isFinite(ceremonies) || ceremonies < 0) ceremonies = 0;
        if (ceremonies > 100) ceremonies = 100;
        if (!Number.isFinite(focus) || focus < 0) focus = 0;
        if (focus > 100) focus = 100;
        people.push({
          name: name,
          holidayDays: holiday,
          ceremoniesPercent: ceremonies,
          focusFactor: focus / 100, // input is a percentage, the maths uses 0..1
        });
      });
      return people;
    }

    function formatHours(n) {
      return (Math.round(n * 10) / 10).toString();
    }

    function formatDays(n) {
      return (Math.round(n * 10) / 10).toString();
    }

    function formatPoints(n) {
      return (Math.round(n * 10) / 10).toString();
    }

    function calculate() {
      if (errorEl) errorEl.textContent = '';
      var sprintDays = parseFloat(sprintDaysInput.value);
      if (!Number.isFinite(sprintDays) || sprintDays <= 0) sprintDays = DEFAULT_SPRINT_DAYS;
      var hoursPerDay = parseFloat(hoursPerDayInput.value);
      if (!Number.isFinite(hoursPerDay) || hoursPerDay <= 0) hoursPerDay = DEFAULT_HOURS_PER_DAY;
      var velocity = parseFloat(velocityInput.value);
      if (!Number.isFinite(velocity) || velocity < 0) velocity = DEFAULT_VELOCITY;
      var band = parseFloat(bandInput.value);
      if (!Number.isFinite(band) || band < 0) band = DEFAULT_CONFIDENCE_BAND * 100;
      var people = readPeople();

      if (people.length === 0) {
        if (errorEl) errorEl.textContent = 'Add at least one team member.';
        return;
      }

      var result;
      try {
        result = teamCapacity({
          sprintDays: sprintDays,
          hoursPerDay: hoursPerDay,
          velocity: velocity,
          confidenceBand: band / 100,
          people: people,
        });
      } catch (err) {
        if (errorEl) errorEl.textContent = err.message;
        return;
      }

      resultHours.textContent = formatHours(result.totalHours) + ' person-hours';
      resultDays.textContent = formatDays(result.totalDays) + ' person-days';
      resultPoints.textContent = formatPoints(result.forecastPoints) + ' story points';
      resultBand.textContent = formatPoints(result.lowPoints) + ' to ' + formatPoints(result.highPoints) + ' story points';

      breakdownBody.innerHTML = '';
      result.rows.forEach(function (r) {
        var tr = document.createElement('tr');
        tr.innerHTML =
          '<td>' + escapeHtml(r.name) + '</td>' +
          '<td>' + r.holidayDays + '</td>' +
          '<td>' + r.ceremoniesPercent + '%</td>' +
          '<td>' + Math.round(r.focusFactor * 100) + '%</td>' +
          '<td>' + formatHours(r.hours) + '</td>' +
          '<td>' + formatDays(r.days) + '</td>' +
          '<td>' + formatPoints(r.points) + '</td>';
        breakdownBody.appendChild(tr);
      });

      workingsList.innerHTML = '';
      var lines = [
        'Sprint length: ' + sprintDays + ' working days at ' + hoursPerDay + ' hours per day.',
        'Per person: (sprint days minus holiday days) x hours per day x focus factor x (1 minus ceremonies percent / 100) = person-hours.',
        'Person-days = person-hours / ' + hoursPerDay + '.',
        'Forecast story points = total person-days x velocity (' + velocity + ' story points per person-day).',
        'Confidence band = forecast x (1 plus or minus ' + band + '%).',
      ];
      result.rows.forEach(function (r) {
        var workingDays = Math.max(sprintDays - r.holidayDays, 0);
        lines.push(
          r.name + ': (' + sprintDays + ' - ' + r.holidayDays + ') x ' + hoursPerDay +
          ' x ' + Math.round(r.focusFactor * 100) + '% x (1 - ' + r.ceremoniesPercent + '%) = ' +
          formatHours(r.hours) + ' hours (' + formatDays(r.days) + ' days, ' + formatPoints(r.points) + ' points).'
        );
        // Reference workingDays in the line so the variable is used and the
        // narrative stays accurate even at the holiday clamp boundary.
        if (workingDays === 0) {
          lines.push(r.name + ' has zero working days this sprint after holiday subtraction.');
        }
      });
      lines.forEach(function (line) {
        var li = document.createElement('li');
        li.textContent = line;
        workingsList.appendChild(li);
      });

      fireResult({
        total_hours: Math.round(result.totalHours * 100) / 100,
        total_days: Math.round(result.totalDays * 100) / 100,
        forecast_points: Math.round(result.forecastPoints * 100) / 100,
        low_points: Math.round(result.lowPoints * 100) / 100,
        high_points: Math.round(result.highPoints * 100) / 100,
        team_size: people.length,
        sprint_days: sprintDays,
        velocity: velocity,
      });
    }

    calculateBtn.addEventListener('click', calculate);

    form.addEventListener('input', function (ev) {
      var t = ev.target;
      var name = t.name || (t.dataset && Object.keys(t.dataset)[0]) || 'input';
      fireInteractionOnce(name);
    });

    var proveDetails = document.querySelector('[data-prove-it]');
    if (proveDetails) {
      proveDetails.addEventListener('toggle', function () {
        if (proveDetails.open) {
          window.dataLayer = window.dataLayer || [];
          window.dataLayer.push({
            event: 'prove_it',
            calculator_name: 'Sprint Capacity Planner',
          });
        }
      });
    }

    // Initial render so the panel is not empty.
    calculate();
  });

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
