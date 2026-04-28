(function () {
  'use strict';

  var lib = window.FileDownloadTime;
  if (!lib) return;

  var CALC_NAME = 'File Download Time Calculator';

  var form = document.querySelector('[data-fdt-form]');
  var sizeEl = document.querySelector('[data-fdt-size]');
  var sizeUnitEl = document.querySelector('[data-fdt-size-unit]');
  var speedEl = document.querySelector('[data-fdt-speed]');
  var speedUnitEl = document.querySelector('[data-fdt-speed-unit]');
  var errorEl = document.querySelector('[data-fdt-error]');
  var resultPanel = document.querySelector('[data-fdt-result]');
  var resultValue = document.querySelector('[data-fdt-result-value]');
  var resultSummary = document.querySelector('[data-fdt-result-summary]');
  var comparisonsBody = document.querySelector('[data-fdt-comparisons]');
  var proveIt = document.querySelector('[data-prove-it]');
  var proveItBody = document.querySelector('[data-prove-it-body]');

  if (!form || !sizeEl || !speedEl) return;

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

  function setError(msg) {
    errorEl.textContent = msg || '';
    errorEl.classList.toggle('calc-row__hint--error', !!msg);
  }

  function clearResult() {
    resultPanel.hidden = true;
    resultValue.textContent = '';
    resultSummary.textContent = '';
    if (comparisonsBody) comparisonsBody.innerHTML = '';
    if (proveItBody) proveItBody.innerHTML = '<p>Enter a file size and a line speed to see the workings.</p>';
  }

  function fmtNumber(n) {
    return n.toLocaleString('en-GB', { maximumFractionDigits: 2 });
  }

  function renderProveIt(r, formatted) {
    var html = '';
    html += '<p><strong>Step 1. Convert the file size to bits.</strong></p>';
    html += '<ul class="working">';
    html += '<li>' + fmtNumber(r.sizeInput) + ' ' + r.sizeUnit + ' = ' + fmtNumber(r.totalBytes) + ' bytes (decimal: 1 ' + r.sizeUnit + ' = ' + fmtNumber(lib.SIZE_UNITS[r.sizeUnit]) + ' bytes)</li>';
    html += '<li>' + fmtNumber(r.totalBytes) + ' bytes &times; 8 = ' + fmtNumber(r.totalBits) + ' bits</li>';
    html += '</ul>';

    html += '<p><strong>Step 2. Convert the line speed to bits per second.</strong></p>';
    html += '<ul class="working">';
    html += '<li>' + fmtNumber(r.speedInput) + ' ' + r.speedUnit + ' = ' + fmtNumber(r.bitsPerSecond) + ' bits per second</li>';
    html += '<li>That is ' + fmtNumber(r.bytesPerSecond / 1000000) + ' MB per second of usable throughput at the wire</li>';
    html += '</ul>';

    html += '<p><strong>Step 3. Divide bits by bits per second to get the raw transfer time.</strong></p>';
    html += '<ul class="working">';
    html += '<li>' + fmtNumber(r.totalBits) + ' &divide; ' + fmtNumber(r.bitsPerSecond) + ' = ' + fmtNumber(r.rawSeconds) + ' seconds</li>';
    html += '</ul>';

    html += '<p><strong>Step 4. Add 5% for protocol overhead.</strong> Real-world TCP/IP, TLS handshake, retransmits and ramp-up sit in the 3 to 8 percent range. 5 percent is a sensible single number.</p>';
    html += '<ul class="working">';
    html += '<li>' + fmtNumber(r.rawSeconds) + ' &times; 0.05 = ' + fmtNumber(r.overheadSeconds) + ' seconds of overhead</li>';
    html += '<li>' + fmtNumber(r.rawSeconds) + ' + ' + fmtNumber(r.overheadSeconds) + ' = ' + fmtNumber(r.seconds) + ' seconds total</li>';
    html += '</ul>';

    html += '<p><strong>Step 5. Format as days, hours, minutes, seconds.</strong></p>';
    html += '<ul class="working"><li>' + fmtNumber(r.seconds) + ' seconds &rarr; <code>' + formatted + '</code></li></ul>';

    proveItBody.innerHTML = html;
  }

  function renderComparisons(bitsPerSecond) {
    if (!comparisonsBody) return;
    var rows = lib.comparisonsAtSpeed(bitsPerSecond);
    if (!rows.length) {
      comparisonsBody.innerHTML = '';
      return;
    }
    var html = '';
    html += '<table class="comparisons-table">';
    html += '<caption>Real-world downloads at this line speed</caption>';
    html += '<thead><tr><th scope="col">File</th><th scope="col">Estimated time</th></tr></thead>';
    html += '<tbody>';
    for (var i = 0; i < rows.length; i++) {
      html += '<tr><td>' + rows[i].label + '</td><td>' + lib.formatDuration(rows[i].seconds) + '</td></tr>';
    }
    html += '</tbody></table>';
    comparisonsBody.innerHTML = html;
  }

  function recalc() {
    setError('');
    var rawSize = sizeEl.value.trim();
    var rawSpeed = speedEl.value.trim();

    if (rawSize === '' || rawSpeed === '') {
      clearResult();
      return;
    }

    var sizeNum = Number(rawSize);
    var speedNum = Number(rawSpeed);

    if (!Number.isFinite(sizeNum) || sizeNum <= 0) {
      setError('Enter a file size greater than zero.');
      clearResult();
      return;
    }
    if (!Number.isFinite(speedNum) || speedNum <= 0) {
      setError('Enter a line speed greater than zero.');
      clearResult();
      return;
    }

    try {
      var r = lib.calculateDownloadTime({
        size: sizeNum,
        sizeUnit: sizeUnitEl.value,
        speed: speedNum,
        speedUnit: speedUnitEl.value
      });
      var formatted = lib.formatDuration(r.seconds);
      resultPanel.hidden = false;
      resultValue.textContent = formatted;
      resultSummary.textContent =
        fmtNumber(sizeNum) + ' ' + sizeUnitEl.value + ' at ' +
        fmtNumber(speedNum) + ' ' + speedUnitEl.value +
        ', including 5% protocol overhead.';
      renderProveIt(r, formatted);
      renderComparisons(r.bitsPerSecond);
      pushResult({
        size_value: sizeNum,
        size_unit: sizeUnitEl.value,
        speed_value: speedNum,
        speed_unit: speedUnitEl.value,
        seconds: Math.round(r.seconds),
        formatted: formatted
      });
    } catch (err) {
      setError(err.message);
      clearResult();
    }
  }

  function onAnyInput(field) {
    return function () {
      pushInteraction(field);
      recalc();
    };
  }

  sizeEl.addEventListener('input', onAnyInput('size'));
  speedEl.addEventListener('input', onAnyInput('speed'));
  sizeUnitEl.addEventListener('change', onAnyInput('sizeUnit'));
  speedUnitEl.addEventListener('change', onAnyInput('speedUnit'));

  if (proveIt) {
    proveIt.addEventListener('toggle', function () {
      if (proveIt.open) {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: 'prove_it', calculator_name: CALC_NAME });
      }
    });
  }

  // Initial state.
  clearResult();
})();
