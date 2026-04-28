'use strict';

/**
 * Page wiring for the SERP CTR Estimator.
 *
 * Pure maths lives in serp-ctr-estimator.js. This file connects form
 * inputs to that library, debounces recalculation, and renders the
 * results card, the prove-it panel, and the position comparison table.
 */
(function () {
  var lib = window.SerpCtrEstimator;
  if (!lib) return;
  var form = document.getElementById('ctr-form');
  if (!form) return;

  var volIn      = document.querySelector('[data-volume]');
  var posIn      = document.querySelector('[data-position]');
  var curveIn    = document.getElementsByName('ctr-curve');
  var brandedIn  = document.querySelector('[data-branded]');
  var brandMultIn= document.querySelector('[data-branded-multiplier]');
  var featSnipIn = document.querySelector('[data-feature-snippet]');
  var paaIn      = document.querySelector('[data-feature-paa]');
  var mapsIn     = document.querySelector('[data-feature-maps]');
  var videoIn    = document.querySelector('[data-feature-video]');
  var erodeSnipIn= document.querySelector('[data-erode-snippet]');
  var erodePaaIn = document.querySelector('[data-erode-paa]');
  var erodeMapsIn= document.querySelector('[data-erode-maps]');
  var erodeVideoIn = document.querySelector('[data-erode-video]');

  var resultCard   = document.querySelector('[data-result-card]');
  var resultExp    = document.querySelector('[data-result-expected]');
  var resultLow    = document.querySelector('[data-result-low]');
  var resultHigh   = document.querySelector('[data-result-high]');
  var resultCtr    = document.querySelector('[data-result-ctr]');
  var resultMsg    = document.querySelector('[data-result-message]');

  var tableBody    = document.querySelector('[data-comparison-tbody]');
  var proveDetails = document.querySelector('[data-prove-it]');
  var proveBody    = document.querySelector('[data-prove-it-body]');

  var firstInteractionFired = false;
  var firstResultFired = false;
  var debounceTimer = null;

  function fireDataLayer(event, payload) {
    window.dataLayer = window.dataLayer || [];
    var obj = { event: event, calculator_name: 'SERP CTR Estimator by Position' };
    if (payload) {
      for (var k in payload) if (Object.prototype.hasOwnProperty.call(payload, k)) obj[k] = payload[k];
    }
    window.dataLayer.push(obj);
  }

  var fmt = new Intl.NumberFormat('en-GB');
  function formatInt(n) {
    if (!Number.isFinite(n)) return '0';
    return fmt.format(Math.round(n));
  }

  function selectedCurve() {
    for (var i = 0; i < curveIn.length; i++) {
      if (curveIn[i].checked) return curveIn[i].value;
    }
    return 'awr';
  }

  function readErosionRate(input, fallback) {
    if (!input) return fallback;
    var n = Number(input.value);
    if (!Number.isFinite(n)) return fallback;
    if (n < 0) n = 0;
    if (n > 100) n = 100;
    return n / 100;
  }

  function readInputs() {
    return {
      volume: Number(volIn && volIn.value),
      position: Number(posIn && posIn.value),
      curve: selectedCurve(),
      branded: !!(brandedIn && brandedIn.checked),
      brandedMultiplier: brandMultIn ? Number(brandMultIn.value) : 1.5,
      features: {
        featuredSnippet: !!(featSnipIn && featSnipIn.checked),
        peopleAlsoAsk:   !!(paaIn && paaIn.checked),
        maps:            !!(mapsIn && mapsIn.checked),
        video:           !!(videoIn && videoIn.checked)
      },
      erosions: {
        featuredSnippet: readErosionRate(erodeSnipIn, 0.30),
        peopleAlsoAsk:   readErosionRate(erodePaaIn, 0.10),
        maps:            readErosionRate(erodeMapsIn, 0.20),
        video:           readErosionRate(erodeVideoIn, 0.10)
      }
    };
  }

  function renderResult(opts, r) {
    if (!resultCard) return;
    if (!r.valid) {
      resultCard.classList.add('result-card--invalid');
      if (resultMsg) resultMsg.textContent = 'Enter a positive monthly search volume and a position between 1 and 20.';
      if (resultExp)  resultExp.textContent = '—';
      if (resultLow)  resultLow.textContent = '—';
      if (resultHigh) resultHigh.textContent = '—';
      if (resultCtr)  resultCtr.textContent = '—';
      return;
    }
    resultCard.classList.remove('result-card--invalid');
    if (resultMsg) resultMsg.textContent = '';
    if (resultExp)  resultExp.textContent  = formatInt(r.expected);
    if (resultLow)  resultLow.textContent  = formatInt(r.low);
    if (resultHigh) resultHigh.textContent = formatInt(r.high);
    if (resultCtr)  resultCtr.textContent  = r.ctrPercent.toFixed(1) + '%';
  }

  function renderTable(opts) {
    if (!tableBody) return;
    var rows = lib.comparisonTable(opts);
    var html = '';
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      html += '<tr>'
        + '<td>P' + row.position + '</td>'
        + '<td>' + row.ctrPercent.toFixed(1) + '%</td>'
        + '<td>' + formatInt(row.expected) + '</td>'
        + '<td>' + formatInt(row.low) + ' – ' + formatInt(row.high) + '</td>'
        + '</tr>';
    }
    tableBody.innerHTML = html;
  }

  function renderProveIt(opts, r) {
    if (!proveBody) return;
    if (!r.valid) {
      proveBody.innerHTML = '<p>Enter valid inputs to see the working.</p>';
      return;
    }
    var curveLabel = r.curve === 'backlinko' ? 'Backlinko 2024' : 'Advanced Web Ranking 2024';
    var brandedNote = opts.branded
      ? 'branded multiplier ' + r.brandedMultiplier
      : 'no branded multiplier (1.0)';
    var activeFeatures = [];
    if (opts.features.featuredSnippet) activeFeatures.push('Featured snippet (' + Math.round(opts.erosions.featuredSnippet * 100) + '%)');
    if (opts.features.peopleAlsoAsk)   activeFeatures.push('People Also Ask (' + Math.round(opts.erosions.peopleAlsoAsk * 100) + '%)');
    if (opts.features.maps)            activeFeatures.push('Maps pack (' + Math.round(opts.erosions.maps * 100) + '%)');
    if (opts.features.video)           activeFeatures.push('Video carousel (' + Math.round(opts.erosions.video * 100) + '%)');

    var featuresLine = activeFeatures.length
      ? activeFeatures.join(', ') + ' &rarr; combined erosion ' + r.erosionMultiplier.toFixed(3)
      : 'no SERP features active (erosion 1.000)';

    var html = ''
      + '<p><strong>Formula:</strong> volume &times; (CTR for position / 100) &times; erosion &times; branded multiplier</p>'
      + '<ul>'
      +   '<li><strong>Volume:</strong> ' + formatInt(r.volume) + '</li>'
      +   '<li><strong>Position:</strong> P' + r.position + '</li>'
      +   '<li><strong>Curve:</strong> ' + curveLabel + ', CTR at this position = ' + r.ctrPercent.toFixed(2) + '%</li>'
      +   '<li><strong>SERP features:</strong> ' + featuresLine + '</li>'
      +   '<li><strong>Branded:</strong> ' + brandedNote + '</li>'
      + '</ul>'
      + '<p><strong>Working:</strong> ' + formatInt(r.volume) + ' &times; ' + (r.ctrPercent / 100).toFixed(4)
      +   ' &times; ' + r.erosionMultiplier.toFixed(3) + ' &times; ' + r.brandedMultiplier.toFixed(2)
      +   ' = <strong>' + formatInt(r.expected) + ' clicks/month</strong> (expected)</p>'
      + '<p>Low/high band is &plusmn;25% of expected to reflect the inherent noise in any organic-CTR forecast: '
      +   formatInt(r.low) + ' to ' + formatInt(r.high) + ' clicks.</p>';
    proveBody.innerHTML = html;
  }

  function recalc(reason) {
    var opts = readInputs();
    var r = lib.estimate(opts);
    renderResult(opts, r);
    renderTable(opts);
    renderProveIt(opts, r);

    if (!firstInteractionFired && reason === 'input') {
      fireDataLayer('calculator_interaction', { field: 'form' });
      firstInteractionFired = true;
    }
    if (r.valid && !firstResultFired) {
      fireDataLayer('calculator_result', {
        position: r.position,
        curve: r.curve,
        expected_clicks: Math.round(r.expected)
      });
      firstResultFired = true;
    }
  }

  function debounced(reason) {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () { recalc(reason); }, 150);
  }

  form.addEventListener('input',  function () { debounced('input'); });
  form.addEventListener('change', function () { debounced('input'); });

  if (proveDetails) {
    proveDetails.addEventListener('toggle', function () {
      if (proveDetails.open) {
        fireDataLayer('prove_it');
      }
    });
  }

  // Initial render with whatever defaults the form has.
  recalc('init');
})();
