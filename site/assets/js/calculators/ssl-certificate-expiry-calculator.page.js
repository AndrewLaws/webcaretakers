(function () {
  'use strict';

  var lib = window.SSLExpiry;
  if (!lib) return;

  var CALC_NAME = 'SSL Certificate Expiry Calculator';

  var modeEls    = document.querySelectorAll('[data-mode]');
  var datePanel  = document.querySelector('[data-date-panel]');
  var pemPanel   = document.querySelector('[data-pem-panel]');
  var dateInput  = document.querySelector('[data-expiry-date]');
  var pemInput   = document.querySelector('[data-pem-text]');
  var leadInput  = document.querySelector('[data-lead-days]');
  var calcBtn    = document.querySelector('[data-calculate]');
  var errorEl    = document.querySelector('[data-error]');
  var resultsEl  = document.querySelector('[data-results]');
  var bandLabel  = document.querySelector('[data-band-label]');
  var daysEl     = document.querySelector('[data-days-remaining]');
  var expiryEl   = document.querySelector('[data-parsed-expiry]');
  var renewEl    = document.querySelector('[data-recommended-renewal]');
  var messageEl  = document.querySelector('[data-band-message]');
  var proveItBody = document.querySelector('[data-prove-it-body]');
  var proveIt    = document.querySelector('[data-prove-it]');

  if (!calcBtn) return;

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
    if (payload) {
      for (var k in payload) {
        if (Object.prototype.hasOwnProperty.call(payload, k)) data[k] = payload[k];
      }
    }
    window.dataLayer.push(data);
  }

  function getMode() {
    for (var i = 0; i < modeEls.length; i++) {
      if (modeEls[i].checked) return modeEls[i].value;
    }
    return 'date';
  }

  function applyMode() {
    var mode = getMode();
    if (mode === 'pem') {
      datePanel.hidden = true;
      pemPanel.hidden = false;
    } else {
      datePanel.hidden = false;
      pemPanel.hidden = true;
    }
  }

  function fmtUTCDate(d) {
    return d.toISOString().slice(0, 10);
  }

  function fmtFullUTC(d) {
    // e.g. "28 April 2026, 12:00 UTC"
    var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    var day = d.getUTCDate();
    var month = months[d.getUTCMonth()];
    var year = d.getUTCFullYear();
    var hh = String(d.getUTCHours()).padStart(2, '0');
    var mm = String(d.getUTCMinutes()).padStart(2, '0');
    return day + ' ' + month + ' ' + year + ', ' + hh + ':' + mm + ' UTC';
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = false;
    resultsEl.hidden = true;
  }

  function hideError() {
    errorEl.textContent = '';
    errorEl.hidden = true;
  }

  function readExpiry() {
    var mode = getMode();
    if (mode === 'pem') {
      var text = pemInput.value || '';
      if (!text.trim()) return { error: 'Paste a certificate or its openssl text dump.' };
      var d = lib.extractNotAfter(text);
      if (!d) return { error: 'Could not find a "Not After : ..." line in that text. Run "openssl x509 -in cert.pem -noout -text" and paste the output, or switch to date mode.' };
      return { date: d };
    }
    var v = dateInput.value || '';
    if (!v.trim()) return { error: 'Pick or type an expiry date.' };
    var parsed = lib.parseExpiryInput(v);
    if (!parsed) return { error: 'That does not look like a date. Use YYYY-MM-DD or a full ISO timestamp.' };
    return { date: parsed };
  }

  function readLead() {
    var raw = parseInt(leadInput.value, 10);
    if (isNaN(raw) || raw < 0) return 30;
    if (raw > 365) return 365;
    return raw;
  }

  function renderProveIt(result, lead) {
    var html = '';
    html += '<p><strong>Working.</strong> Pure date arithmetic, run in your browser. No network call is made, the certificate is not validated against the live host, and no chain checks happen here.</p>';
    html += '<ul class="working">';
    html += '<li>Expiry parsed as: <code>' + result.expiry.toISOString() + '</code></li>';
    html += '<li>Today (your clock, UTC): <code>' + result.now.toISOString() + '</code></li>';
    html += '<li>Days remaining = floor((expiry &minus; now) / 86,400,000 ms) = <strong>' + result.daysRemaining + '</strong></li>';
    html += '<li>Band rule: &lt; 0 expired, 0&ndash;7 critical, 8&ndash;30 warning, 31&ndash;60 caution, &gt; 60 healthy. Result: <strong>' + result.band.label + '</strong></li>';
    html += '<li>Recommended renewal date = expiry &minus; ' + lead + ' day' + (lead === 1 ? '' : 's') + ' = <strong>' + fmtUTCDate(result.recommendedRenewal) + '</strong></li>';
    html += '</ul>';
    html += '<p>This page does not contact your server. If you need an actual live check (chain, hostname, OCSP), use <code>openssl s_client -connect host:443</code> or a monitoring service.</p>';
    if (proveItBody) proveItBody.innerHTML = html;
  }

  function calculate() {
    hideError();
    var read = readExpiry();
    if (read.error) {
      showError(read.error);
      return;
    }
    var lead = readLead();
    var result = lib.assess(read.date, { leadDays: lead });

    bandLabel.textContent = result.band.label;
    bandLabel.setAttribute('data-band', result.band.id);
    daysEl.textContent = String(result.daysRemaining);
    expiryEl.textContent = fmtFullUTC(result.expiry);
    renewEl.textContent = fmtUTCDate(result.recommendedRenewal);
    messageEl.textContent = result.band.message;

    resultsEl.hidden = false;
    renderProveIt(result, lead);

    pushResult({
      days_remaining: result.daysRemaining,
      band: result.band.id,
      lead_days: lead,
      mode: getMode()
    });
  }

  for (var i = 0; i < modeEls.length; i++) {
    modeEls[i].addEventListener('change', function () {
      applyMode();
      pushInteraction('mode');
    });
  }
  if (dateInput) dateInput.addEventListener('input', function () { pushInteraction('expiry_date'); });
  if (pemInput) pemInput.addEventListener('input', function () { pushInteraction('pem'); });
  if (leadInput) leadInput.addEventListener('input', function () { pushInteraction('lead_days'); });

  calcBtn.addEventListener('click', calculate);

  if (proveIt) {
    proveIt.addEventListener('toggle', function () {
      if (proveIt.open) {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: 'prove_it', calculator_name: CALC_NAME });
      }
    });
  }

  applyMode();
})();
