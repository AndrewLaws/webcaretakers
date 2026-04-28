(function () {
  'use strict';

  var lib = window.ProjectDeadlineCountdown;
  if (!lib) return;

  var CALC_NAME = 'Project Deadline Countdown Calculator';

  var deadlineEl = document.querySelector('[data-pdc-deadline]');
  var startEl    = document.querySelector('[data-pdc-start]');
  var hoursEl    = document.querySelector('[data-pdc-hours]');
  var holidaysEl = document.querySelector('[data-pdc-holidays]');
  var dayCheckboxes = document.querySelectorAll('[data-pdc-day]');
  var addUkBtn   = document.querySelector('[data-pdc-add-uk]');
  var clearHolBtn = document.querySelector('[data-pdc-clear-holidays]');
  var calcBtn    = document.querySelector('[data-pdc-calc]');

  var resultsPanel = document.querySelector('[data-pdc-results]');
  var calDaysEl  = document.querySelector('[data-pdc-cal-days]');
  var workDaysEl = document.querySelector('[data-pdc-work-days]');
  var workHoursEl = document.querySelector('[data-pdc-work-hours]');
  var elapsedRow = document.querySelector('[data-pdc-elapsed-row]');
  var elapsedPctEl = document.querySelector('[data-pdc-elapsed-pct]');
  var progressBar = document.querySelector('[data-pdc-progress]');
  var summaryEl  = document.querySelector('[data-pdc-summary]');
  var pastFlag   = document.querySelector('[data-pdc-past-flag]');
  var noWorkFlag = document.querySelector('[data-pdc-no-work-flag]');
  var errorEl    = document.querySelector('[data-pdc-error]');
  var calendarEl = document.querySelector('[data-pdc-calendar]');
  var proveItBody = document.querySelector('[data-prove-it-body]');
  var proveIt    = document.querySelector('[data-prove-it]');

  if (!deadlineEl) return;

  // Set start to today by default
  function todayLocal() {
    var n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }
  function isoFor(d) {
    return lib.toIsoDateString(d);
  }
  if (startEl && !startEl.value) startEl.value = isoFor(todayLocal());

  var firedInteraction = false;
  function pushInteraction(field) {
    window.dataLayer = window.dataLayer || [];
    if (!firedInteraction) {
      firedInteraction = true;
      window.dataLayer.push({
        event: 'calculator_interaction',
        calculator_name: CALC_NAME,
        field: field || ''
      });
    }
  }
  function pushResult(payload) {
    window.dataLayer = window.dataLayer || [];
    var data = { event: 'calculator_result', calculator_name: CALC_NAME };
    if (payload) for (var k in payload) if (Object.prototype.hasOwnProperty.call(payload, k)) data[k] = payload[k];
    window.dataLayer.push(data);
  }

  function getWorkingWeekdays() {
    var arr = [];
    for (var i = 0; i < dayCheckboxes.length; i++) {
      if (dayCheckboxes[i].checked) {
        arr.push(parseInt(dayCheckboxes[i].value, 10));
      }
    }
    return arr;
  }

  function setError(msg) {
    if (!errorEl) return;
    errorEl.textContent = msg || '';
    errorEl.classList.toggle('calc-row__hint--error', !!msg);
  }

  function fmtNumber(n) {
    return n.toLocaleString('en-GB');
  }

  function fmtDate(d) {
    var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return days[d.getDay()] + ' ' + d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
  }

  function clearResults() {
    if (resultsPanel) resultsPanel.hidden = true;
    if (proveItBody) proveItBody.innerHTML = '<p>Enter a deadline above and press Calculate to see the working.</p>';
  }

  function addUkHolidays() {
    var existing = (holidaysEl.value || '').split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
    var seen = {};
    for (var i = 0; i < existing.length; i++) {
      var p = lib.parseDateInput(existing[i]);
      if (p) seen[lib.toIsoDateString(p)] = true;
    }
    var added = [];
    for (var j = 0; j < lib.UK_2026_BANK_HOLIDAYS.length; j++) {
      var iso = lib.UK_2026_BANK_HOLIDAYS[j];
      if (!seen[iso]) {
        existing.push(iso);
        added.push(iso);
      }
    }
    holidaysEl.value = existing.join('\n');
    pushInteraction('add_uk_holidays');
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'cta_click',
      calculator_name: CALC_NAME,
      action: 'add_uk_2026_bank_holidays',
      added_count: added.length
    });
  }

  function renderCalendar(start, deadline, workingWeekdays, holidaySet, workingDates) {
    if (!calendarEl) return;
    // If the range is huge, show only the first 60 calendar days from start.
    var diff = lib.calendarDaysBetween(start, deadline);
    var rangeStart, rangeEnd;
    if (diff < 0) {
      // Past deadline: show range from deadline to start.
      rangeStart = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
      rangeEnd = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    } else {
      rangeStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      rangeEnd = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
    }
    var span = lib.calendarDaysBetween(rangeStart, rangeEnd);
    var truncated = false;
    if (span > 90) {
      rangeEnd = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate() + 90);
      truncated = true;
    }

    var workingSet = {};
    for (var i = 0; i < workingDates.length; i++) {
      workingSet[lib.toIsoDateString(workingDates[i])] = true;
    }

    var html = '<div class="pdc-mini-cal" role="grid" aria-label="Days between start and deadline, working days highlighted">';
    var cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate());
    var endTime = rangeEnd.getTime();
    while (cursor.getTime() <= endTime) {
      var iso = lib.toIsoDateString(cursor);
      var classes = ['pdc-mini-cal__cell'];
      var label = cursor.getDate();
      var title = fmtDate(cursor);
      if (iso === lib.toIsoDateString(start)) {
        classes.push('pdc-mini-cal__cell--start');
        title += ' (start)';
      }
      if (iso === lib.toIsoDateString(deadline)) {
        classes.push('pdc-mini-cal__cell--deadline');
        title += ' (deadline)';
      }
      if (workingSet[iso]) {
        classes.push('pdc-mini-cal__cell--working');
      }
      if (holidaySet[iso]) {
        classes.push('pdc-mini-cal__cell--holiday');
        title += ' (holiday)';
      }
      var dow = cursor.getDay();
      if (dow === 0 || dow === 6) {
        classes.push('pdc-mini-cal__cell--weekend');
      }
      html += '<span class="' + classes.join(' ') + '" title="' + title + '">' + label + '</span>';
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
    }
    html += '</div>';
    if (truncated) {
      html += '<p class="pdc-mini-cal__note">Showing the first 90 days. The full count above covers the entire range.</p>';
    }
    html += '<ul class="pdc-mini-cal__legend">'
      + '<li><span class="pdc-mini-cal__swatch pdc-mini-cal__swatch--working"></span> Working day</li>'
      + '<li><span class="pdc-mini-cal__swatch pdc-mini-cal__swatch--weekend"></span> Non-working weekday or weekend</li>'
      + '<li><span class="pdc-mini-cal__swatch pdc-mini-cal__swatch--holiday"></span> Holiday</li>'
      + '<li><span class="pdc-mini-cal__swatch pdc-mini-cal__swatch--start"></span> Start</li>'
      + '<li><span class="pdc-mini-cal__swatch pdc-mini-cal__swatch--deadline"></span> Deadline</li>'
      + '</ul>';

    calendarEl.innerHTML = html;
  }

  function renderProveIt(start, deadline, workingWeekdays, holidayParse, result, calDays, workHours, hoursPerDay) {
    if (!proveItBody) return;
    var dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    var picked = workingWeekdays.map(function (d) { return dayNames[d]; }).join(', ') || 'none';
    var html = '';
    html += '<p><strong>The algorithm.</strong> Walk one day at a time from the day after the start through to and including the deadline. For each day, check whether its weekday is one of the working days you ticked, and whether its date appears in the holidays list. If both checks pass, it counts as a working day.</p>';
    html += '<ul class="working">';
    html += '<li>Start: <strong>' + fmtDate(start) + '</strong></li>';
    html += '<li>Deadline: <strong>' + fmtDate(deadline) + '</strong></li>';
    html += '<li>Calendar days between them: <strong>' + fmtNumber(calDays) + '</strong></li>';
    html += '<li>Working weekdays selected: <strong>' + picked + '</strong></li>';
    html += '<li>Hours per working day: <strong>' + hoursPerDay + '</strong></li>';
    html += '<li>Working days returned: <strong>' + fmtNumber(result.workingDays) + '</strong></li>';
    html += '<li>Working hours returned: <strong>' + fmtNumber(workHours) + '</strong></li>';
    html += '</ul>';

    if (holidayParse.valid.length === 0) {
      html += '<p>No holidays were entered, so only the weekday rule was applied.</p>';
    } else {
      html += '<p><strong>Holidays parsed:</strong> ' + holidayParse.valid.length + ' date'
        + (holidayParse.valid.length === 1 ? '' : 's') + '.</p>';
      if (result.holidaysHit && result.holidaysHit.length > 0) {
        html += '<p><strong>Holidays that affected the count</strong> (fell on a working weekday inside the range):</p><ul class="working">';
        for (var i = 0; i < result.holidaysHit.length; i++) {
          var d = lib.parseDateInput(result.holidaysHit[i]);
          html += '<li>' + (d ? fmtDate(d) : result.holidaysHit[i]) + '</li>';
        }
        html += '</ul>';
      } else {
        html += '<p>None of the holidays you entered fell on a working weekday inside the range, so none of them changed the count.</p>';
      }
    }
    if (holidayParse.invalid.length > 0) {
      html += '<p class="calc-row__hint--error"><strong>Lines that did not parse as dates and were ignored:</strong> '
        + holidayParse.invalid.map(function (s) { return s.replace(/[<>&]/g, ''); }).join(', ') + '.</p>';
    }

    proveItBody.innerHTML = html;
  }

  function calculate() {
    setError('');
    if (pastFlag) pastFlag.hidden = true;
    if (noWorkFlag) noWorkFlag.hidden = true;

    var deadline = lib.parseDateInput(deadlineEl.value);
    if (!deadline) {
      setError('Enter a valid deadline date.');
      clearResults();
      return;
    }
    var start = lib.parseDateInput(startEl.value) || todayLocal();

    var hoursPerDay = parseFloat(hoursEl.value);
    if (!isFinite(hoursPerDay) || hoursPerDay < 0) hoursPerDay = 7.5;

    var workingWeekdays = getWorkingWeekdays();
    var holidayParse = lib.parseHolidays(holidaysEl.value);

    var result = lib.countWorkingDays(start, deadline, workingWeekdays, holidayParse.valid);
    var calDays = lib.calendarDaysBetween(start, deadline);
    var workHours = Math.round(result.workingDays * hoursPerDay * 10) / 10;

    if (resultsPanel) resultsPanel.hidden = false;
    if (calDaysEl) calDaysEl.textContent = fmtNumber(calDays);
    if (workDaysEl) workDaysEl.textContent = fmtNumber(result.workingDays);
    if (workHoursEl) workHoursEl.textContent = fmtNumber(workHours);

    var pct = lib.elapsedPercent(start, todayLocal(), deadline);
    if (calDays >= 0 && elapsedRow) {
      elapsedRow.hidden = false;
      if (elapsedPctEl) elapsedPctEl.textContent = pct + '%';
      if (progressBar) {
        progressBar.value = pct;
        progressBar.setAttribute('aria-valuenow', String(pct));
      }
    } else if (elapsedRow) {
      elapsedRow.hidden = true;
    }

    if (calDays === 0) {
      summaryEl.textContent = 'The deadline is today. 0 working days remaining.';
    } else if (calDays > 0) {
      summaryEl.textContent = fmtNumber(result.workingDays) + ' working days = '
        + fmtNumber(calDays) + ' calendar days = '
        + fmtNumber(workHours) + ' working hours.';
    } else {
      summaryEl.textContent = 'Deadline was ' + fmtNumber(Math.abs(result.workingDays))
        + ' working day' + (Math.abs(result.workingDays) === 1 ? '' : 's')
        + ' ago (' + fmtNumber(Math.abs(calDays)) + ' calendar day'
        + (Math.abs(calDays) === 1 ? '' : 's') + ').';
      if (pastFlag) pastFlag.hidden = false;
    }

    if (workingWeekdays.length === 0) {
      if (noWorkFlag) noWorkFlag.hidden = false;
    }

    var holidaySet = lib.buildHolidaySet(holidayParse.valid);
    renderCalendar(start, deadline, workingWeekdays, holidaySet, result.workingDates);
    renderProveIt(start, deadline, workingWeekdays, holidayParse, result, calDays, workHours, hoursPerDay);

    pushResult({
      calendar_days: calDays,
      working_days: result.workingDays,
      working_hours: workHours,
      elapsed_percent: pct,
      holidays_count: holidayParse.valid.length
    });
  }

  if (calcBtn) calcBtn.addEventListener('click', function (e) { e.preventDefault(); calculate(); });
  if (addUkBtn) addUkBtn.addEventListener('click', function (e) { e.preventDefault(); addUkHolidays(); });
  if (clearHolBtn) clearHolBtn.addEventListener('click', function (e) {
    e.preventDefault();
    holidaysEl.value = '';
    pushInteraction('clear_holidays');
  });

  // Track interactions on form changes.
  ['change', 'input'].forEach(function (evt) {
    if (deadlineEl) deadlineEl.addEventListener(evt, function () { pushInteraction('deadline'); });
    if (startEl) startEl.addEventListener(evt, function () { pushInteraction('start'); });
    if (hoursEl) hoursEl.addEventListener(evt, function () { pushInteraction('hours'); });
    if (holidaysEl) holidaysEl.addEventListener(evt, function () { pushInteraction('holidays'); });
  });
  for (var i = 0; i < dayCheckboxes.length; i++) {
    dayCheckboxes[i].addEventListener('change', function () { pushInteraction('working_days'); });
  }

  if (proveIt) {
    proveIt.addEventListener('toggle', function () {
      if (proveIt.open) {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: 'prove_it', calculator_name: CALC_NAME });
      }
    });
  }
})();
