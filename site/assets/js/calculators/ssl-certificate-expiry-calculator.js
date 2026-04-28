'use strict';

/**
 * SSL Certificate Expiry Calculator: pure-logic library.
 *
 * Date arithmetic helper around an SSL/TLS certificate expiry date. It does
 * not contact any server, does not validate a chain, and does not parse PEM
 * with a real ASN.1 library. The PEM-paste mode is a convenience: it greps
 * for the standard "Not After : <date>" line that openssl x509 -text emits,
 * and parses that one line. If your tooling formats the validity line
 * differently, paste the date directly instead.
 *
 * Bands (days remaining, where today is 0):
 *   < 0    expired
 *   0..7   critical
 *   8..30  warning
 *   31..60 caution
 *   > 60   healthy
 */

var MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysBetween(from, to) {
  // Whole-day difference, rounded toward zero so identical instants give 0.
  // Negative when `to` is before `from`.
  var diff = (to.getTime() - from.getTime()) / MS_PER_DAY;
  if (diff >= 0) return Math.floor(diff);
  return Math.ceil(diff);
}

var BANDS = {
  expired: {
    id: 'expired',
    label: 'Expired',
    message: 'The certificate has already expired. Browsers will warn or block users until it is replaced. Renew immediately.'
  },
  critical: {
    id: 'critical',
    label: 'Critical',
    message: 'Less than a week left. Renew today and schedule the deployment, do not wait for the weekend.'
  },
  warning: {
    id: 'warning',
    label: 'Warning',
    message: 'Inside the renewal window most teams use. Get the new certificate ordered and queued for deployment.'
  },
  caution: {
    id: 'caution',
    label: 'Caution',
    message: 'Plenty of time, but worth putting on the calendar. Order in the next few weeks if your renewal needs vendor sign-off.'
  },
  healthy: {
    id: 'healthy',
    label: 'Healthy',
    message: 'Comfortably outside the renewal window. Set a reminder around the recommended renewal date and forget about it.'
  }
};

function bandFor(daysRemaining) {
  if (daysRemaining < 0) return BANDS.expired;
  if (daysRemaining <= 7) return BANDS.critical;
  if (daysRemaining <= 30) return BANDS.warning;
  if (daysRemaining <= 60) return BANDS.caution;
  return BANDS.healthy;
}

function recommendedRenewalDate(expiry, leadDays) {
  var lead = (typeof leadDays === 'number' && leadDays >= 0) ? leadDays : 30;
  return new Date(expiry.getTime() - lead * MS_PER_DAY);
}

// --- PEM-paste extraction ------------------------------------------------

var MONTHS = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
};

// Matches the openssl text-dump validity line, e.g.
//   Not After : Apr 28 12:00:00 2026 GMT
// Day can be one or two digits (openssl pads single-digit days with a space).
var NOT_AFTER_RE = /Not After\s*:\s*([A-Z][a-z]{2})\s+(\d{1,2})\s+(\d{2}):(\d{2}):(\d{2})\s+(\d{4})\s*GMT/;

function extractNotAfter(text) {
  if (!text || typeof text !== 'string') return null;
  var m = NOT_AFTER_RE.exec(text);
  if (!m) return null;
  var month = MONTHS[m[1]];
  if (typeof month !== 'number') return null;
  var day = parseInt(m[2], 10);
  var hour = parseInt(m[3], 10);
  var min = parseInt(m[4], 10);
  var sec = parseInt(m[5], 10);
  var year = parseInt(m[6], 10);
  return new Date(Date.UTC(year, month, day, hour, min, sec));
}

// --- Free-form date parsing ---------------------------------------------

var YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseExpiryInput(value) {
  if (!value || typeof value !== 'string') return null;
  var trimmed = value.trim();
  if (!trimmed) return null;
  var ymd = YMD_RE.exec(trimmed);
  if (ymd) {
    var d = new Date(Date.UTC(parseInt(ymd[1], 10), parseInt(ymd[2], 10) - 1, parseInt(ymd[3], 10)));
    if (!isNaN(d.getTime())) return d;
  }
  var iso = new Date(trimmed);
  if (!isNaN(iso.getTime())) return iso;
  return null;
}

// --- Top-level assessor --------------------------------------------------

function assess(expiry, options) {
  var opts = options || {};
  var now = opts.now || new Date();
  var leadDays = (typeof opts.leadDays === 'number' && opts.leadDays >= 0) ? opts.leadDays : 30;
  var days = daysBetween(now, expiry);
  return {
    expiry: expiry,
    now: now,
    daysRemaining: days,
    band: bandFor(days),
    leadDays: leadDays,
    recommendedRenewal: recommendedRenewalDate(expiry, leadDays)
  };
}

var exported = {
  daysBetween: daysBetween,
  bandFor: bandFor,
  BANDS: BANDS,
  recommendedRenewalDate: recommendedRenewalDate,
  extractNotAfter: extractNotAfter,
  parseExpiryInput: parseExpiryInput,
  assess: assess
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exported;
}
if (typeof window !== 'undefined') {
  window.SSLExpiry = exported;
}
