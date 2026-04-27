'use strict';

/**
 * Time Zone Converter: pure-logic library plus DOM init.
 *
 * Conversion is anchored on a single UTC instant, derived from the user's
 * chosen wall-clock time in the source IANA zone. From that instant we ask
 * Intl.DateTimeFormat to render the same moment in each target zone. DST is
 * resolved by the OS-supplied tzdata that Intl reads from. We never roll our
 * own offset table.
 *
 * The trick for going from "wall-clock time in zone X" to a UTC instant is
 * the round-trip: take a candidate UTC instant (treat the wall-clock as if
 * it were UTC), format it in zone X, see what offset that produces, and
 * subtract. One iteration is enough for any IANA zone whose offset is
 * constant within an hour of the candidate, which covers everything except
 * the exact moment the clock changes.
 */

// A curated list of about 60 commonly-needed IANA zones with display labels.
// The free-text input lets users type any other valid IANA name.
var CURATED_ZONES = [
  // Reference
  { id: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  // Europe
  { id: 'Europe/London', label: 'London (UK)' },
  { id: 'Europe/Dublin', label: 'Dublin (Ireland)' },
  { id: 'Europe/Lisbon', label: 'Lisbon (Portugal)' },
  { id: 'Europe/Paris', label: 'Paris (France)' },
  { id: 'Europe/Berlin', label: 'Berlin (Germany)' },
  { id: 'Europe/Madrid', label: 'Madrid (Spain)' },
  { id: 'Europe/Rome', label: 'Rome (Italy)' },
  { id: 'Europe/Amsterdam', label: 'Amsterdam (Netherlands)' },
  { id: 'Europe/Brussels', label: 'Brussels (Belgium)' },
  { id: 'Europe/Zurich', label: 'Zurich (Switzerland)' },
  { id: 'Europe/Vienna', label: 'Vienna (Austria)' },
  { id: 'Europe/Warsaw', label: 'Warsaw (Poland)' },
  { id: 'Europe/Stockholm', label: 'Stockholm (Sweden)' },
  { id: 'Europe/Helsinki', label: 'Helsinki (Finland)' },
  { id: 'Europe/Athens', label: 'Athens (Greece)' },
  { id: 'Europe/Istanbul', label: 'Istanbul (Turkey)' },
  { id: 'Europe/Moscow', label: 'Moscow (Russia)' },
  // Africa
  { id: 'Africa/Casablanca', label: 'Casablanca (Morocco)' },
  { id: 'Africa/Lagos', label: 'Lagos (Nigeria)' },
  { id: 'Africa/Cairo', label: 'Cairo (Egypt)' },
  { id: 'Africa/Johannesburg', label: 'Johannesburg (South Africa)' },
  { id: 'Africa/Nairobi', label: 'Nairobi (Kenya)' },
  // Middle East
  { id: 'Asia/Jerusalem', label: 'Jerusalem (Israel)' },
  { id: 'Asia/Dubai', label: 'Dubai (UAE)' },
  { id: 'Asia/Tehran', label: 'Tehran (Iran)' },
  { id: 'Asia/Riyadh', label: 'Riyadh (Saudi Arabia)' },
  // Asia
  { id: 'Asia/Karachi', label: 'Karachi (Pakistan)' },
  { id: 'Asia/Kolkata', label: 'Kolkata / Mumbai / Delhi (India)' },
  { id: 'Asia/Kathmandu', label: 'Kathmandu (Nepal)' },
  { id: 'Asia/Dhaka', label: 'Dhaka (Bangladesh)' },
  { id: 'Asia/Bangkok', label: 'Bangkok (Thailand)' },
  { id: 'Asia/Jakarta', label: 'Jakarta (Indonesia)' },
  { id: 'Asia/Singapore', label: 'Singapore' },
  { id: 'Asia/Kuala_Lumpur', label: 'Kuala Lumpur (Malaysia)' },
  { id: 'Asia/Manila', label: 'Manila (Philippines)' },
  { id: 'Asia/Hong_Kong', label: 'Hong Kong' },
  { id: 'Asia/Shanghai', label: 'Shanghai / Beijing (China)' },
  { id: 'Asia/Taipei', label: 'Taipei (Taiwan)' },
  { id: 'Asia/Seoul', label: 'Seoul (South Korea)' },
  { id: 'Asia/Tokyo', label: 'Tokyo (Japan)' },
  // Oceania
  { id: 'Australia/Perth', label: 'Perth (Australia, west)' },
  { id: 'Australia/Adelaide', label: 'Adelaide (Australia, central)' },
  { id: 'Australia/Brisbane', label: 'Brisbane (Australia, Queensland)' },
  { id: 'Australia/Sydney', label: 'Sydney / Melbourne (Australia, east)' },
  { id: 'Pacific/Auckland', label: 'Auckland (New Zealand)' },
  { id: 'Pacific/Fiji', label: 'Fiji' },
  { id: 'Pacific/Honolulu', label: 'Honolulu (Hawaii)' },
  // Americas
  { id: 'America/Anchorage', label: 'Anchorage (Alaska)' },
  { id: 'America/Los_Angeles', label: 'Los Angeles (US Pacific)' },
  { id: 'America/Vancouver', label: 'Vancouver (Canada Pacific)' },
  { id: 'America/Denver', label: 'Denver (US Mountain)' },
  { id: 'America/Phoenix', label: 'Phoenix (Arizona, no DST)' },
  { id: 'America/Chicago', label: 'Chicago (US Central)' },
  { id: 'America/Mexico_City', label: 'Mexico City (Mexico)' },
  { id: 'America/New_York', label: 'New York (US Eastern)' },
  { id: 'America/Toronto', label: 'Toronto (Canada Eastern)' },
  { id: 'America/Halifax', label: 'Halifax (Atlantic)' },
  { id: 'America/St_Johns', label: 'St. John\'s (Newfoundland)' },
  { id: 'America/Sao_Paulo', label: 'Sao Paulo (Brazil)' },
  { id: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires (Argentina)' },
  { id: 'America/Santiago', label: 'Santiago (Chile)' },
  { id: 'America/Bogota', label: 'Bogota (Colombia)' },
  { id: 'America/Lima', label: 'Lima (Peru)' }
];

function curatedZones() { return CURATED_ZONES.slice(); }

// Validates an IANA zone name by asking Intl to use it. If it throws, no.
function isValidZone(zone) {
  if (typeof zone !== 'string' || !zone) return false;
  try {
    // eslint-disable-next-line no-new
    new Intl.DateTimeFormat('en-GB', { timeZone: zone });
    return true;
  } catch (e) {
    return false;
  }
}

// Returns the offset in MINUTES for a given UTC instant in a given zone.
// Positive means the zone is ahead of UTC.
function zoneOffsetMinutes(instant, zone) {
  // Use formatToParts in en-US (predictable English month/AM-PM) and parse
  // the components, then compute (zoneWallClock - utcWallClock) in minutes.
  var dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  var parts = dtf.formatToParts(instant);
  var p = {};
  parts.forEach(function (it) { p[it.type] = it.value; });
  // Build a "wall-clock as if it were UTC" timestamp from the parts
  var asUtc = Date.UTC(
    parseInt(p.year, 10),
    parseInt(p.month, 10) - 1,
    parseInt(p.day, 10),
    parseInt(p.hour, 10),
    parseInt(p.minute, 10),
    parseInt(p.second, 10)
  );
  return Math.round((asUtc - instant.getTime()) / 60000);
}

// Format an offset in minutes as "UTC+1", "UTC-5", "UTC+5:30", etc.
function formatOffsetMinutes(mins) {
  var sign = mins >= 0 ? '+' : '-';
  var abs = Math.abs(mins);
  var h = Math.floor(abs / 60);
  var m = abs % 60;
  if (m === 0) return 'UTC' + sign + h;
  // Pad minutes to two digits, e.g. UTC+5:30, UTC+5:45
  var mm = m < 10 ? '0' + m : '' + m;
  return 'UTC' + sign + h + ':' + mm;
}

// Convert a wall-clock date+time in a source zone to a UTC Date instant.
// dateStr is "YYYY-MM-DD", timeStr is "HH:MM" (24-hour) or "HH:MM:SS".
function parseLocalToUtc(zone, dateStr, timeStr) {
  if (!isValidZone(zone)) throw new Error('Unknown zone: ' + zone);
  var dateParts = String(dateStr).split('-');
  var timeParts = String(timeStr || '00:00').split(':');
  var Y = parseInt(dateParts[0], 10);
  var M = parseInt(dateParts[1], 10);
  var D = parseInt(dateParts[2], 10);
  var h = parseInt(timeParts[0], 10) || 0;
  var m = parseInt(timeParts[1], 10) || 0;
  var s = timeParts[2] ? parseInt(timeParts[2], 10) || 0 : 0;

  // Candidate: pretend the wall-clock is UTC. This is wrong by exactly the
  // zone's offset at that moment. Compute that offset, then subtract.
  var candidate = new Date(Date.UTC(Y, M - 1, D, h, m, s));
  var offsetMins = zoneOffsetMinutes(candidate, zone);
  var corrected = new Date(candidate.getTime() - offsetMins * 60000);

  // Re-check: in DST-transition cases the corrected instant might fall in a
  // different offset to the candidate. One more pass settles it for normal
  // zones; ambiguous wall-clocks (autumn fall-back) and non-existent
  // wall-clocks (spring forward) will pick a deterministic, stable answer.
  var offset2 = zoneOffsetMinutes(corrected, zone);
  if (offset2 !== offsetMins) {
    corrected = new Date(candidate.getTime() - offset2 * 60000);
  }
  return corrected;
}

// Format a UTC instant in a given zone, producing user-facing labels.
// Returns { dateLabel, weekdayLabel, timeLabel, offsetLabel, isoLocal }.
function formatInZone(instant, zone, opts) {
  opts = opts || {};
  var hour12 = !!opts.hour12;
  if (!isValidZone(zone)) throw new Error('Unknown zone: ' + zone);

  var weekdayFmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: zone,
    weekday: 'short'
  });
  var weekdayLabel = weekdayFmt.format(instant);
  var dateOnlyFmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: zone,
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  var dateLabel = dateOnlyFmt.format(instant);

  var timeFmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: zone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: hour12,
    hourCycle: hour12 ? 'h12' : 'h23'
  });
  var timeLabel = timeFmt.format(instant);

  var offsetMins = zoneOffsetMinutes(instant, zone);
  var offsetLabel = formatOffsetMinutes(offsetMins);

  // ISO-like local string for the prove-it panel: "2026-07-01 12:00"
  var iso = (function () {
    var ymdFmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    var hmFmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: zone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    });
    return ymdFmt.format(instant) + ' ' + hmFmt.format(instant);
  })();

  return {
    weekdayLabel: weekdayLabel,
    dateLabel: dateLabel,
    timeLabel: timeLabel,
    offsetLabel: offsetLabel,
    isoLocal: iso
  };
}

// Try to detect the user's local IANA zone. Falls back to UTC.
function detectLocalZone() {
  try {
    var z = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (z && isValidZone(z)) return z;
  } catch (e) {}
  return 'UTC';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    curatedZones: curatedZones,
    isValidZone: isValidZone,
    zoneOffsetMinutes: zoneOffsetMinutes,
    formatOffsetMinutes: formatOffsetMinutes,
    parseLocalToUtc: parseLocalToUtc,
    formatInZone: formatInZone,
    detectLocalZone: detectLocalZone
  };
}

if (typeof window !== 'undefined') {
  window.TimeZoneConverter = {
    curatedZones: curatedZones,
    isValidZone: isValidZone,
    zoneOffsetMinutes: zoneOffsetMinutes,
    formatOffsetMinutes: formatOffsetMinutes,
    parseLocalToUtc: parseLocalToUtc,
    formatInZone: formatInZone,
    detectLocalZone: detectLocalZone
  };

  document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('tzc-form');
    if (!form) return;

    var sourceZoneSelect = form.querySelector('[data-source-zone]');
    var sourceZoneCustom = form.querySelector('[data-source-zone-custom]');
    var dateInput = form.querySelector('[data-date]');
    var timeInput = form.querySelector('[data-time]');
    var nowBtn = form.querySelector('[data-now-btn]');
    var addBtn = document.querySelector('[data-add-zone]');
    var hour12Toggle = form.querySelector('[data-hour12]');
    var targetsContainer = document.querySelector('[data-targets]');
    var sourceLabel = document.querySelector('[data-source-label]');
    var anchorLabel = document.querySelector('[data-utc-anchor]');

    var firstInteractionFired = false;
    var lastResultKey = '';
    var hour12 = false;

    // Populate the curated zone dropdown(s)
    function buildZoneOptionsHtml(selectedId) {
      var html = '<option value="__custom__">Other (type IANA name)…</option>';
      CURATED_ZONES.forEach(function (z) {
        var sel = z.id === selectedId ? ' selected' : '';
        html += '<option value="' + z.id + '"' + sel + '>' + z.label + '</option>';
      });
      return html;
    }

    var detected = detectLocalZone();
    sourceZoneSelect.innerHTML = buildZoneOptionsHtml(detected);
    // If the detected zone is not in the curated list, fall back to custom
    var detectedInList = CURATED_ZONES.some(function (z) { return z.id === detected; });
    if (!detectedInList) {
      sourceZoneSelect.value = '__custom__';
      sourceZoneCustom.value = detected;
      sourceZoneCustom.hidden = false;
    }

    // Default date and time to "now" in the detected zone
    function setNowDefaults() {
      var now = new Date();
      var ymdFmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: getCurrentSourceZone(),
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      var hmFmt = new Intl.DateTimeFormat('en-GB', {
        timeZone: getCurrentSourceZone(),
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
      });
      dateInput.value = ymdFmt.format(now);
      timeInput.value = hmFmt.format(now);
    }

    function getCurrentSourceZone() {
      if (sourceZoneSelect.value === '__custom__') {
        return sourceZoneCustom.value || 'UTC';
      }
      return sourceZoneSelect.value;
    }

    // Build initial 3 target zone slots with sensible defaults
    var defaultTargets = ['America/New_York', 'Asia/Tokyo', 'Australia/Sydney'];
    // If detected zone matches a default, swap it for London so we don't show
    // a target that just mirrors the source.
    defaultTargets = defaultTargets.map(function (z) {
      return z === detected ? 'Europe/London' : z;
    });

    function makeTargetRow(zoneId) {
      var li = document.createElement('li');
      li.className = 'tzc-target';
      li.innerHTML =
        '<div class="tzc-target__select-row">' +
          '<label>Target zone' +
            '<select data-target-zone>' + buildZoneOptionsHtml(zoneId) + '</select>' +
          '</label>' +
          '<input type="text" data-target-zone-custom hidden placeholder="IANA name, e.g. Europe/Madrid">' +
          '<button type="button" class="tzc-target__remove" data-remove-target aria-label="Remove this zone">Remove</button>' +
        '</div>' +
        '<div class="tzc-target__result" data-target-result aria-live="polite">—</div>';
      // Wire up custom-zone toggle
      var sel = li.querySelector('[data-target-zone]');
      var custom = li.querySelector('[data-target-zone-custom]');
      sel.addEventListener('change', function () {
        if (sel.value === '__custom__') {
          custom.hidden = false;
          custom.focus();
        } else {
          custom.hidden = true;
        }
        recompute();
      });
      custom.addEventListener('input', recompute);
      li.querySelector('[data-remove-target]').addEventListener('click', function () {
        li.parentNode.removeChild(li);
        recompute();
      });
      targetsContainer.appendChild(li);
    }

    defaultTargets.forEach(makeTargetRow);

    setNowDefaults();

    function fireInteractionOnce(field) {
      if (firstInteractionFired) return;
      firstInteractionFired = true;
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'calculator_interaction',
        calculator_name: 'Time Zone Converter',
        field: field || ''
      });
    }

    function fireResultIfChanged(payload) {
      var key = payload.source_zone + '|' + payload.utc_iso + '|' + payload.target_count;
      if (key === lastResultKey) return;
      lastResultKey = key;
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(Object.assign({
        event: 'calculator_result',
        calculator_name: 'Time Zone Converter'
      }, payload));
    }

    function getTargetZoneFromRow(row) {
      var sel = row.querySelector('[data-target-zone]');
      var custom = row.querySelector('[data-target-zone-custom]');
      if (sel.value === '__custom__') return (custom.value || '').trim();
      return sel.value;
    }

    function recompute() {
      var sourceZone = getCurrentSourceZone();
      if (!isValidZone(sourceZone)) {
        sourceLabel.textContent = 'Unknown source zone: ' + sourceZone;
        anchorLabel.textContent = '';
        return;
      }
      if (!dateInput.value || !timeInput.value) return;

      var utc;
      try {
        utc = parseLocalToUtc(sourceZone, dateInput.value, timeInput.value);
      } catch (e) {
        sourceLabel.textContent = 'Could not parse the date and time.';
        return;
      }

      var srcOut = formatInZone(utc, sourceZone, { hour12: hour12 });
      sourceLabel.textContent =
        srcOut.weekdayLabel + ' ' + srcOut.dateLabel + ', ' +
        srcOut.timeLabel + ' ' + srcOut.offsetLabel + ' (' + sourceZone + ')';
      anchorLabel.textContent = utc.toISOString();

      var rows = targetsContainer.querySelectorAll('.tzc-target');
      var targetCount = 0;
      rows.forEach(function (row) {
        var resultEl = row.querySelector('[data-target-result]');
        var zone = getTargetZoneFromRow(row);
        if (!zone || !isValidZone(zone)) {
          resultEl.textContent = zone ? ('Unknown zone: ' + zone) : '—';
          return;
        }
        targetCount++;
        var out = formatInZone(utc, zone, { hour12: hour12 });
        resultEl.innerHTML =
          '<strong>' + zone + '</strong><br>' +
          out.weekdayLabel + ' ' + out.dateLabel + ', ' +
          out.timeLabel + ' ' + out.offsetLabel;
      });

      fireResultIfChanged({
        source_zone: sourceZone,
        utc_iso: utc.toISOString(),
        target_count: targetCount,
        hour12: hour12
      });
    }

    // Wire up source zone selector
    sourceZoneSelect.addEventListener('change', function () {
      fireInteractionOnce('source_zone');
      if (sourceZoneSelect.value === '__custom__') {
        sourceZoneCustom.hidden = false;
        sourceZoneCustom.focus();
      } else {
        sourceZoneCustom.hidden = true;
      }
      recompute();
    });
    sourceZoneCustom.addEventListener('input', function () {
      fireInteractionOnce('source_zone_custom');
      recompute();
    });

    dateInput.addEventListener('input', function () {
      fireInteractionOnce('date');
      recompute();
    });
    timeInput.addEventListener('input', function () {
      fireInteractionOnce('time');
      recompute();
    });

    nowBtn.addEventListener('click', function () {
      fireInteractionOnce('now');
      setNowDefaults();
      recompute();
    });

    addBtn.addEventListener('click', function () {
      fireInteractionOnce('add_zone');
      makeTargetRow('Europe/London');
      recompute();
    });

    hour12Toggle.addEventListener('change', function () {
      fireInteractionOnce('hour12');
      hour12 = !!hour12Toggle.checked;
      recompute();
    });

    // Prove-it datalayer
    var proveDetails = document.querySelector('[data-prove-it]');
    if (proveDetails) {
      proveDetails.addEventListener('toggle', function () {
        if (proveDetails.open) {
          window.dataLayer = window.dataLayer || [];
          window.dataLayer.push({
            event: 'prove_it',
            calculator_name: 'Time Zone Converter'
          });
        }
      });
    }

    // First render
    recompute();
  });
}
