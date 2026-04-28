// Meeting Cost Calculator. Browser-only, no network calls.
//
// Maths reference:
//   hourlyRate(salary, overheads) = (salary * overheads) / WORKING_HOURS_PER_YEAR
//   attendeeCost = hourlyRate * (durationMinutes / 60)
//   meetingCost  = sum over rows of (count * attendeeCost)
//
// WORKING_HOURS_PER_YEAR is fixed at 1,800: 37.5 hours/week × 48 working
// weeks/year (a typical UK full-time figure once you net off holiday and bank
// holidays). Documented in the Prove it panel on the page so users can audit it.

'use strict';

const WORKING_HOURS_PER_YEAR = 1800;
const DEFAULT_OVERHEADS_MULTIPLIER = 1.3;

const CURRENCIES = {
  GBP: '£',
  USD: '$',
  EUR: '€',
};

function hourlyRate(salary, overheads) {
  if (!Number.isFinite(salary) || salary < 0) {
    throw new Error('hourlyRate: salary must be a non-negative number');
  }
  if (!Number.isFinite(overheads) || overheads <= 0) {
    throw new Error('hourlyRate: overheads must be a positive number');
  }
  return (salary * overheads) / WORKING_HOURS_PER_YEAR;
}

function attendeeCost({ salary, overheads, durationMinutes }) {
  if (!Number.isFinite(durationMinutes) || durationMinutes < 0) {
    throw new Error('attendeeCost: durationMinutes must be non-negative');
  }
  if (durationMinutes === 0) return 0;
  return hourlyRate(salary, overheads) * (durationMinutes / 60);
}

// Pure totalling. Each row: { label?, count, salary }.
// Returns { total, rows: [{ label, count, salary, hourly, perPerson, cost }] }.
function meetingCost({ rows, overheads, durationMinutes }) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('meetingCost: rows must be a non-empty array');
  }
  if (!Number.isFinite(durationMinutes) || durationMinutes < 0) {
    throw new Error('meetingCost: durationMinutes must be non-negative');
  }
  if (!Number.isFinite(overheads) || overheads <= 0) {
    throw new Error('meetingCost: overheads must be positive');
  }
  const out = rows.map(function (row) {
    if (!Number.isFinite(row.count) || row.count < 0) {
      throw new Error('meetingCost: row.count must be non-negative');
    }
    if (!Number.isFinite(row.salary) || row.salary < 0) {
      throw new Error('meetingCost: row.salary must be non-negative');
    }
    const hourly = hourlyRate(row.salary, overheads);
    const perPerson = durationMinutes === 0 ? 0 : hourly * (durationMinutes / 60);
    const cost = perPerson * row.count;
    return {
      label: row.label || '',
      count: row.count,
      salary: row.salary,
      hourly: hourly,
      perPerson: perPerson,
      cost: cost,
    };
  });
  const total = out.reduce(function (acc, r) { return acc + r.cost; }, 0);
  return { total: total, rows: out };
}

function annualisedWeeklyCost(meetingTotal) {
  return meetingTotal * 52;
}

function totalPersonHours({ rows, durationMinutes }) {
  if (durationMinutes === 0) return 0;
  const heads = rows.reduce(function (acc, r) { return acc + (r.count || 0); }, 0);
  return heads * (durationMinutes / 60);
}

// Live ticker: linear cost accrual against elapsed wall time.
// elapsedSeconds and totalSeconds in seconds. Clamped at totalCost.
function liveTickerCost(totalCost, elapsedSeconds, totalSeconds) {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return 0;
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) return 0;
  if (elapsedSeconds >= totalSeconds) return totalCost;
  return totalCost * (elapsedSeconds / totalSeconds);
}

function formatMoney(amount, currencyCode) {
  const symbol = CURRENCIES[currencyCode] || '£';
  const safe = Number.isFinite(amount) ? amount : 0;
  // Use Intl for grouping, then prepend the symbol so the user controls the
  // currency badge without any FX conversion. £100,000 input is £100,000
  // regardless of the symbol they chose.
  const formatted = new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
  return symbol + formatted;
}

const exported = {
  WORKING_HOURS_PER_YEAR,
  DEFAULT_OVERHEADS_MULTIPLIER,
  CURRENCIES,
  hourlyRate,
  attendeeCost,
  meetingCost,
  annualisedWeeklyCost,
  totalPersonHours,
  liveTickerCost,
  formatMoney,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exported;
}
if (typeof window !== 'undefined') {
  window.MeetingCostCalculator = exported;
}

// ── Browser wiring ────────────────────────────────────────────────────────
// Only runs in the browser. Hooks up the form, prove-it panel, currency
// selector, and the live ticker. No-op outside a DOM environment.
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('meeting-cost-form');
    if (!form) return;

    var modeRadios = form.querySelectorAll('[data-mode]');
    var simplePanel = form.querySelector('[data-simple-panel]');
    var detailedPanel = form.querySelector('[data-detailed-panel]');
    var addRowBtn = form.querySelector('[data-add-row]');
    var detailedRowsEl = form.querySelector('[data-detailed-rows]');
    var rowTemplate = document.getElementById('row-template');

    var currencySel = form.querySelector('[data-currency]');
    var overheadsInput = form.querySelector('[data-overheads]');
    var durationInput = form.querySelector('[data-duration]');

    // Simple-mode inputs
    var simpleAttendees = form.querySelector('[data-simple-attendees]');
    var simpleSalary = form.querySelector('[data-simple-salary]');

    // Result targets
    var resultTotal = document.querySelector('[data-result-total]');
    var resultAnnual = document.querySelector('[data-result-annual]');
    var resultHours = document.querySelector('[data-result-hours]');
    var breakdownBody = document.querySelector('[data-breakdown-body]');
    var workingsList = document.querySelector('[data-workings]');

    // Ticker
    var tickerStartBtn = document.querySelector('[data-ticker-start]');
    var tickerPauseBtn = document.querySelector('[data-ticker-pause]');
    var tickerResetBtn = document.querySelector('[data-ticker-reset]');
    var tickerCost = document.querySelector('[data-ticker-cost]');
    var tickerTime = document.querySelector('[data-ticker-time]');
    var tickerStatus = document.querySelector('[data-ticker-status]');

    var calculateBtn = document.querySelector('[data-calculate]');

    var firstInteractionFired = false;
    var lastResult = null;

    function fireInteractionOnce(field) {
      if (firstInteractionFired) return;
      firstInteractionFired = true;
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'calculator_interaction',
        calculator_name: 'Meeting Cost Calculator',
        field: field || null,
      });
    }

    function fireResult(payload) {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(Object.assign({
        event: 'calculator_result',
        calculator_name: 'Meeting Cost Calculator',
      }, payload));
    }

    function setMode(mode) {
      if (mode === 'detailed') {
        simplePanel.hidden = true;
        detailedPanel.hidden = false;
      } else {
        simplePanel.hidden = false;
        detailedPanel.hidden = true;
      }
    }

    modeRadios.forEach(function (r) {
      r.addEventListener('change', function () {
        if (r.checked) {
          fireInteractionOnce('mode');
          setMode(r.value);
        }
      });
    });

    function addDetailedRow(label, count, salary) {
      if (!rowTemplate) return;
      var clone = rowTemplate.content.firstElementChild.cloneNode(true);
      if (label !== undefined) clone.querySelector('[data-row-label]').value = label;
      if (count !== undefined) clone.querySelector('[data-row-count]').value = count;
      if (salary !== undefined) clone.querySelector('[data-row-salary]').value = salary;
      var removeBtn = clone.querySelector('[data-row-remove]');
      removeBtn.addEventListener('click', function () {
        var rows = detailedRowsEl.querySelectorAll('[data-detailed-row]');
        if (rows.length <= 1) return; // keep at least one row
        clone.remove();
      });
      detailedRowsEl.appendChild(clone);
    }

    if (addRowBtn) {
      addRowBtn.addEventListener('click', function () {
        fireInteractionOnce('add-row');
        addDetailedRow('', 1, 50000);
      });
    }

    // Seed the detailed panel with two example rows so the user can see the shape.
    addDetailedRow('Engineer', 3, 80000);
    addDetailedRow('Manager', 1, 95000);

    function readRows() {
      var mode = form.querySelector('[data-mode]:checked').value;
      if (mode === 'simple') {
        var count = parseFloat(simpleAttendees.value);
        var salary = parseFloat(simpleSalary.value);
        if (!Number.isFinite(count) || count < 0) count = 0;
        if (!Number.isFinite(salary) || salary < 0) salary = 0;
        return [{ label: 'Attendee', count: count, salary: salary }];
      }
      var rows = [];
      detailedRowsEl.querySelectorAll('[data-detailed-row]').forEach(function (el) {
        var label = el.querySelector('[data-row-label]').value || '';
        var count = parseFloat(el.querySelector('[data-row-count]').value);
        var salary = parseFloat(el.querySelector('[data-row-salary]').value);
        if (!Number.isFinite(count) || count < 0) count = 0;
        if (!Number.isFinite(salary) || salary < 0) salary = 0;
        rows.push({ label: label, count: count, salary: salary });
      });
      if (rows.length === 0) rows.push({ label: 'Attendee', count: 0, salary: 0 });
      return rows;
    }

    function calculate() {
      var rows = readRows();
      var overheads = parseFloat(overheadsInput.value);
      if (!Number.isFinite(overheads) || overheads <= 0) overheads = DEFAULT_OVERHEADS_MULTIPLIER;
      var duration = parseFloat(durationInput.value);
      if (!Number.isFinite(duration) || duration < 0) duration = 0;
      var currency = currencySel.value || 'GBP';

      var result = meetingCost({ rows: rows, overheads: overheads, durationMinutes: duration });
      var annual = annualisedWeeklyCost(result.total);
      var hours = totalPersonHours({ rows: rows, durationMinutes: duration });

      lastResult = {
        rows: rows,
        result: result,
        overheads: overheads,
        duration: duration,
        currency: currency,
        annual: annual,
        hours: hours,
      };

      resultTotal.textContent = formatMoney(result.total, currency);
      resultAnnual.textContent = formatMoney(annual, currency);
      resultHours.textContent = (Math.round(hours * 100) / 100).toString() + ' person-hours';

      // Breakdown table
      breakdownBody.innerHTML = '';
      result.rows.forEach(function (r) {
        var tr = document.createElement('tr');
        tr.innerHTML =
          '<td>' + escapeHtml(r.label || 'Attendee') + '</td>' +
          '<td>' + r.count + '</td>' +
          '<td>' + formatMoney(r.salary, currency) + '</td>' +
          '<td>' + formatMoney(r.hourly, currency) + '</td>' +
          '<td>' + formatMoney(r.cost, currency) + '</td>';
        breakdownBody.appendChild(tr);
      });

      // Workings narrative
      workingsList.innerHTML = '';
      var working = [
        'Working hours per year used: ' + WORKING_HOURS_PER_YEAR + ' (37.5 hours per week x 48 working weeks).',
        'Overheads multiplier applied: x' + overheads + '. This bumps raw salary up to cover employer NI, pension, holiday, equipment and the desk they sit at. Set it to 1.0 to ignore overheads.',
        'Meeting duration: ' + duration + ' minutes.',
        'Per attendee: hourly rate x (' + duration + ' / 60).',
        'Total: sum of (per attendee x count) across every row.',
        'Annualised figure assumes the same meeting runs once a week for 52 weeks.',
      ];
      working.forEach(function (line) {
        var li = document.createElement('li');
        li.textContent = line;
        workingsList.appendChild(li);
      });

      fireResult({
        total_cost: Math.round(result.total * 100) / 100,
        annual_cost: Math.round(annual * 100) / 100,
        person_hours: Math.round(hours * 100) / 100,
        duration_minutes: duration,
        currency: currency,
        head_count: rows.reduce(function (a, r) { return a + r.count; }, 0),
      });
    }

    calculateBtn.addEventListener('click', calculate);

    // Fire interaction event on any form input
    form.addEventListener('input', function (ev) {
      var t = ev.target;
      var name = t.name || (t.dataset && Object.keys(t.dataset)[0]) || 'input';
      fireInteractionOnce(name);
    });

    // Currency change just reformats the displayed numbers, no recalc.
    currencySel.addEventListener('change', function () {
      fireInteractionOnce('currency');
      if (!lastResult) return;
      var c = currencySel.value || 'GBP';
      lastResult.currency = c;
      resultTotal.textContent = formatMoney(lastResult.result.total, c);
      resultAnnual.textContent = formatMoney(lastResult.annual, c);
      // Re-render breakdown so its currency symbols update
      breakdownBody.innerHTML = '';
      lastResult.result.rows.forEach(function (r) {
        var tr = document.createElement('tr');
        tr.innerHTML =
          '<td>' + escapeHtml(r.label || 'Attendee') + '</td>' +
          '<td>' + r.count + '</td>' +
          '<td>' + formatMoney(r.salary, c) + '</td>' +
          '<td>' + formatMoney(r.hourly, c) + '</td>' +
          '<td>' + formatMoney(r.cost, c) + '</td>';
        breakdownBody.appendChild(tr);
      });
    });

    // ── Live ticker ─────────────────────────────────────────────────────
    var ticker = {
      timerId: null,
      startedAt: 0,           // wall clock millis at start
      accumulatedMs: 0,       // paused-time-aware elapsed
      running: false,
    };

    function tickerElapsedMs() {
      if (!ticker.running) return ticker.accumulatedMs;
      return ticker.accumulatedMs + (Date.now() - ticker.startedAt);
    }

    function renderTicker() {
      if (!lastResult) {
        tickerCost.textContent = formatMoney(0, currencySel.value || 'GBP');
        tickerTime.textContent = '00:00';
        return;
      }
      var totalSeconds = lastResult.duration * 60;
      var elapsedMs = tickerElapsedMs();
      var elapsedSec = elapsedMs / 1000;
      var cost = liveTickerCost(lastResult.result.total, elapsedSec, totalSeconds);
      tickerCost.textContent = formatMoney(cost, lastResult.currency);
      // mm:ss display
      var sec = Math.floor(elapsedSec);
      var m = Math.floor(sec / 60);
      var s = sec % 60;
      tickerTime.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }

    function tickerLoop() {
      renderTicker();
      // Stop once we hit the meeting duration, but keep the cost pinned.
      if (lastResult && tickerElapsedMs() / 1000 >= lastResult.duration * 60) {
        if (ticker.timerId) {
          clearInterval(ticker.timerId);
          ticker.timerId = null;
        }
        ticker.running = false;
        if (tickerStatus) tickerStatus.textContent = 'Meeting elapsed';
      }
    }

    function startTicker() {
      if (!lastResult) calculate();
      if (!lastResult || lastResult.duration <= 0) return;
      if (ticker.running) return;
      ticker.running = true;
      ticker.startedAt = Date.now();
      if (tickerStatus) tickerStatus.textContent = 'Running';
      if (ticker.timerId) clearInterval(ticker.timerId);
      ticker.timerId = setInterval(tickerLoop, 100); // 10 fps, no drift (uses wall clock)
      tickerLoop();
    }

    function pauseTicker() {
      if (!ticker.running) return;
      ticker.accumulatedMs += Date.now() - ticker.startedAt;
      ticker.running = false;
      if (ticker.timerId) {
        clearInterval(ticker.timerId);
        ticker.timerId = null;
      }
      if (tickerStatus) tickerStatus.textContent = 'Paused';
      renderTicker();
    }

    function resetTicker() {
      ticker.accumulatedMs = 0;
      ticker.startedAt = 0;
      ticker.running = false;
      if (ticker.timerId) {
        clearInterval(ticker.timerId);
        ticker.timerId = null;
      }
      if (tickerStatus) tickerStatus.textContent = 'Stopped';
      renderTicker();
    }

    if (tickerStartBtn) tickerStartBtn.addEventListener('click', startTicker);
    if (tickerPauseBtn) tickerPauseBtn.addEventListener('click', pauseTicker);
    if (tickerResetBtn) tickerResetBtn.addEventListener('click', resetTicker);

    // Prove-it datalayer
    var proveDetails = document.querySelector('[data-prove-it]');
    if (proveDetails) {
      proveDetails.addEventListener('toggle', function () {
        if (proveDetails.open) {
          window.dataLayer = window.dataLayer || [];
          window.dataLayer.push({
            event: 'prove_it',
            calculator_name: 'Meeting Cost Calculator',
          });
        }
      });
    }

    // Initial render so empty zeros show up sensibly.
    calculate();
    renderTicker();
  });

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
