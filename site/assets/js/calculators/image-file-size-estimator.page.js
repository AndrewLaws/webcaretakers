(function () {
  'use strict';

  var lib = window.ImageFileSizeEstimator;
  if (!lib) return;

  var CALC_NAME = 'Image File Size Estimator';

  var form = document.querySelector('[data-ifse-form]');
  var widthEl = document.querySelector('[data-ifse-width]');
  var heightEl = document.querySelector('[data-ifse-height]');
  var formatEl = document.querySelector('[data-ifse-format]');
  var qualityEl = document.querySelector('[data-ifse-quality]');
  var qualityRow = document.querySelector('[data-ifse-quality-row]');
  var pngContentEl = document.querySelector('[data-ifse-png-content]');
  var pngRow = document.querySelector('[data-ifse-png-row]');
  var errorEl = document.querySelector('[data-ifse-error]');
  var resultPanel = document.querySelector('[data-ifse-result]');
  var resultValue = document.querySelector('[data-ifse-result-value]');
  var resultSummary = document.querySelector('[data-ifse-result-summary]');
  var comparisonEl = document.querySelector('[data-ifse-comparison]');
  var proveIt = document.querySelector('[data-prove-it]');
  var proveItBody = document.querySelector('[data-prove-it-body]');

  if (!form || !widthEl || !heightEl || !formatEl) return;

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
    resultValue.textContent = '—';
    resultSummary.textContent = '';
    if (comparisonEl) comparisonEl.innerHTML = '';
    if (proveItBody) proveItBody.innerHTML = '<p>Enter dimensions, a format and a quality to see the working.</p>';
  }

  function fmtNumber(n) {
    return Number(n).toLocaleString('en-GB', { maximumFractionDigits: 4 });
  }

  function syncFormatVisibility() {
    var format = formatEl.value;
    if (format === 'PNG') {
      qualityRow.hidden = true;
      pngRow.hidden = false;
    } else {
      qualityRow.hidden = false;
      pngRow.hidden = true;
    }
  }

  function renderComparison(rows, currentFormat) {
    if (!comparisonEl) return;
    var html = '<table class="comparisons-table">';
    html += '<caption>Per-format estimate at the same dimensions</caption>';
    html += '<thead><tr><th scope="col">Format</th><th scope="col">Estimated size</th><th scope="col">Notes</th></tr></thead>';
    html += '<tbody>';
    rows.forEach(function (r) {
      var marker = r.format === currentFormat ? ' <strong>(selected)</strong>' : '';
      html += '<tr><td>' + r.format + marker + '</td><td>' + lib.formatBytes(r.bytes) + '</td><td>' + r.note + '</td></tr>';
    });
    html += '</tbody></table>';
    html += '<p class="hash-rows__note">Real-world variance is roughly plus or minus 30 percent depending on the source image and encoder.</p>';
    comparisonEl.innerHTML = html;
  }

  function renderProveIt(r) {
    var html = '';
    html += '<p><strong>The chosen formula</strong></p>';
    html += '<ul class="working"><li><code>' + r.formula + '</code></li></ul>';

    html += '<p><strong>Step 1. Pixel count.</strong></p>';
    html += '<ul class="working"><li>' + fmtNumber(r.width) + ' &times; ' + fmtNumber(r.height) + ' = ' + fmtNumber(r.pixels) + ' pixels</li></ul>';

    if (r.format === 'PNG') {
      html += '<p><strong>Step 2. Raw 24-bit size.</strong></p>';
      html += '<ul class="working"><li>' + fmtNumber(r.pixels) + ' &times; 3 bytes = ' + fmtNumber(r.rawBytes) + ' bytes uncompressed</li></ul>';
      html += '<p><strong>Step 3. Apply the deflate ratio for ' + r.pngContent + ' content.</strong></p>';
      html += '<ul class="working"><li>Coefficient: ' + fmtNumber(r.deflate) + ' (photo content compresses to ~55%, flat graphics to ~20%)</li>';
      html += '<li>' + fmtNumber(r.rawBytes) + ' &times; ' + fmtNumber(r.deflate) + ' = ' + fmtNumber(r.bytes) + ' bytes</li></ul>';
    } else {
      html += '<p><strong>Step 2. JPEG bytes-per-pixel from quality.</strong></p>';
      html += '<ul class="working"><li>0.02 + 0.20 &times; (' + fmtNumber(r.quality) + '/100)<sup>2</sup> = ' + fmtNumber(r.jpegBytesPerPixel) + ' bytes per pixel</li></ul>';
      html += '<p><strong>Step 3. Apply the format coefficient.</strong></p>';
      html += '<ul class="working"><li>' + r.format + ' coefficient: ' + fmtNumber(r.coefficient) + '</li>';
      html += '<li>' + fmtNumber(r.jpegBytesPerPixel) + ' &times; ' + fmtNumber(r.coefficient) + ' = ' + fmtNumber(r.bytesPerPixel) + ' bytes per pixel</li></ul>';
      html += '<p><strong>Step 4. Multiply by pixel count.</strong></p>';
      html += '<ul class="working"><li>' + fmtNumber(r.pixels) + ' &times; ' + fmtNumber(r.bytesPerPixel) + ' = ' + fmtNumber(r.bytes) + ' bytes</li></ul>';
    }

    html += '<p><strong>Heuristic, not a guarantee.</strong> These coefficients are calibrated against typical cameras and encoders, but real-world variance is roughly plus or minus 30 percent depending on the entropy of the actual image, encoder, chroma subsampling and quality scale interpretation.</p>';
    proveItBody.innerHTML = html;
  }

  function recalc() {
    setError('');
    var rawW = widthEl.value.trim();
    var rawH = heightEl.value.trim();
    if (rawW === '' || rawH === '') {
      clearResult();
      return;
    }
    var w = Number(rawW);
    var h = Number(rawH);
    if (!Number.isFinite(w) || w <= 0) {
      setError('Width must be greater than zero.');
      clearResult();
      return;
    }
    if (!Number.isFinite(h) || h <= 0) {
      setError('Height must be greater than zero.');
      clearResult();
      return;
    }
    var format = formatEl.value;
    var quality = Number(qualityEl.value);
    if (format !== 'PNG') {
      if (!Number.isFinite(quality) || quality < 1 || quality > 100) {
        setError('Quality must be between 1 and 100.');
        clearResult();
        return;
      }
    } else {
      // PNG estimate doesn't use quality, but pass a safe default for compareFormats.
      if (!Number.isFinite(quality) || quality < 1 || quality > 100) quality = 85;
    }
    var pngContent = pngContentEl ? pngContentEl.value : 'photo';

    try {
      var r = lib.estimate({
        width: w,
        height: h,
        format: format,
        quality: quality,
        pngContent: pngContent
      });
      var rows = lib.compareFormats({
        width: w,
        height: h,
        quality: quality,
        pngContent: pngContent
      });
      resultPanel.hidden = false;
      resultValue.textContent = lib.formatBytes(r.bytes);
      var summaryQuality = format === 'PNG'
        ? 'PNG (' + pngContent + ' content)'
        : format + ' at quality ' + quality;
      resultSummary.textContent = w + ' x ' + h + ' as ' + summaryQuality + '. Heuristic estimate, plus or minus 30%.';
      renderComparison(rows, format);
      renderProveIt(r);
      pushResult({
        width: w,
        height: h,
        format: format,
        quality: format === 'PNG' ? null : quality,
        png_content: format === 'PNG' ? pngContent : null,
        bytes: Math.round(r.bytes)
      });
    } catch (err) {
      setError(err.message);
      clearResult();
    }
  }

  function onAnyInput(field) {
    return function () {
      pushInteraction(field);
      if (field === 'format') syncFormatVisibility();
      recalc();
    };
  }

  widthEl.addEventListener('input', onAnyInput('width'));
  heightEl.addEventListener('input', onAnyInput('height'));
  formatEl.addEventListener('change', onAnyInput('format'));
  qualityEl.addEventListener('input', onAnyInput('quality'));
  if (pngContentEl) pngContentEl.addEventListener('change', onAnyInput('pngContent'));

  if (proveIt) {
    proveIt.addEventListener('toggle', function () {
      if (proveIt.open) {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: 'prove_it', calculator_name: CALC_NAME });
      }
    });
  }

  // Initial state: show defaults already filled in.
  syncFormatVisibility();
  recalc();
})();
