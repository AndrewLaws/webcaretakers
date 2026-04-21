'use strict';

// Pure-logic iCal event generator. Produces a valid iCalendar (.ics) string
// following RFC 5545.
//
// Line folding: lines > 75 octets are folded with CRLF + SPACE.
// Text escaping: commas, semicolons and backslashes are escaped per spec.
// All-day events: DTSTART/DTEND use VALUE=DATE. DTEND is exclusive (endDate + 1).
// Timezone: 'UTC' appends Z; 'floating' uses local time with no zone indicator;
//   any other value is treated as an IANA name and added via TZID parameter.

function generateICalString(opts) {
  const {
    title,
    startDate,              // YYYY-MM-DD
    startTime,              // HH:MM (ignored when allDay is true)
    endDate,                // YYYY-MM-DD
    endTime,                // HH:MM (ignored when allDay is true)
    allDay       = false,
    timezone     = 'UTC',   // 'UTC' | 'floating' | IANA name e.g. 'Europe/London'
    location     = '',
    description  = '',
    url          = '',
    recurrence   = 'none',  // 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'
    recurrenceCount = null,
    uid: providedUid = null,
  } = opts || {};

  if (!title || !title.trim())  throw new Error('title is required');
  if (!startDate)               throw new Error('startDate is required');
  if (!endDate)                 throw new Error('endDate is required');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) throw new Error('startDate must be YYYY-MM-DD');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate))   throw new Error('endDate must be YYYY-MM-DD');
  if (!allDay && !startTime)    throw new Error('startTime is required for timed events');
  if (!allDay && !endTime)      throw new Error('endTime is required for timed events');

  const startKey = allDay ? startDate : startDate + 'T' + startTime;
  const endKey   = allDay ? endDate   : endDate   + 'T' + endTime;
  if (endKey < startKey) throw new Error('end must be on or after start');

  const uid     = providedUid || (Date.now() + '-' + Math.random().toString(36).slice(2) + '@webcaretakers.com');
  const dtstamp = formatUTCNow();

  let dtstart, dtend;
  if (allDay) {
    dtstart = 'DTSTART;VALUE=DATE:' + compact(startDate);
    dtend   = 'DTEND;VALUE=DATE:'   + compact(addDays(endDate, 1));
  } else if (timezone === 'UTC') {
    dtstart = 'DTSTART:'            + compactDT(startDate, startTime) + 'Z';
    dtend   = 'DTEND:'              + compactDT(endDate, endTime)     + 'Z';
  } else if (timezone === 'floating') {
    dtstart = 'DTSTART:'            + compactDT(startDate, startTime);
    dtend   = 'DTEND:'              + compactDT(endDate, endTime);
  } else {
    dtstart = 'DTSTART;TZID=' + timezone + ':' + compactDT(startDate, startTime);
    dtend   = 'DTEND;TZID='   + timezone + ':' + compactDT(endDate, endTime);
  }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//WebCaretakers//iCal Event Generator//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    'UID:'      + uid,
    'DTSTAMP:'  + dtstamp,
    dtstart,
    dtend,
    'SUMMARY:'  + escapeText(title.trim()),
  ];

  if (location.trim())    lines.push('LOCATION:'    + escapeText(location.trim()));
  if (description.trim()) lines.push('DESCRIPTION:' + escapeText(description.trim()));
  if (url.trim())         lines.push('URL:'         + url.trim());

  if (recurrence !== 'none') {
    const freq  = recurrence.toUpperCase();
    let rrule   = 'RRULE:FREQ=' + freq;
    if (recurrenceCount && Number.isInteger(recurrenceCount) && recurrenceCount > 1) {
      rrule += ';COUNT=' + recurrenceCount;
    }
    lines.push(rrule);
  }

  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');

  return lines.map(foldLine).join('\r\n') + '\r\n';
}

function compact(date) {
  return date.replace(/-/g, '');
}

function compactDT(date, time) {
  return compact(date) + 'T' + time.replace(':', '') + '00';
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function formatUTCNow() {
  return new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
}

function escapeText(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/,/g,  '\\,')
    .replace(/;/g,  '\\;')
    .replace(/\n/g, '\\n');
}

function foldLine(line) {
  if (line.length <= 75) return line;
  let result = line.slice(0, 75);
  let pos = 75;
  while (pos < line.length) {
    result += '\r\n ' + line.slice(pos, pos + 74);
    pos += 74;
  }
  return result;
}

const exported = { generateICalString };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exported;
}
if (typeof window !== 'undefined') {
  window.ICalGenerator = exported;
}
