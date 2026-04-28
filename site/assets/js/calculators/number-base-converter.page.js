(function () {
  'use strict';

  var lib = window.NumberBaseConverter;
  if (!lib) return;

  var CALC_NAME = 'Number Base Converter';
  var FIELDS = ['bin', 'oct', 'dec', 'hex'];

  var inputs = {};
  var errors = {};
  for (var i = 0; i < FIELDS.length; i++) {
    var f = FIELDS[i];
    inputs[f] = document.querySelector('[data-nbc-field="' + f + '"]');
    errors[f] = document.querySelector('[data-nbc-error="' + f + '"]');
  }
  if (!inputs.bin || !inputs.oct || !inputs.dec || !inputs.hex) return;

  var arbValue = document.querySelector('[data-nbc-arb-value]');
  var arbBase  = document.querySelector('[data-nbc-arb-base]');
  var arbError = document.querySelector('[data-nbc-arb-error]');

  var safetyNote = document.querySelector('[data-nbc-safety]');
  var proveBody  = document.querySelector('[data-nbc-prove-body]');
  var proveIt    = document.querySelector('[data-prove-it]');

  var firedInteraction = false;
  function pushInteraction(field) {
    window.dataLayer = window.dataLayer || [];
    if (!firedInteraction) {
      firedInteraction = true;
      window.dataLayer.push({ event: 'calculator_interaction', calculator_name: CALC_NAME, field: field || '' });
    }
  }
  function pushResult(source, result) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'calculator_result',
      calculator_name: CALC_NAME,
      source_field: source,
      decimal_value: result.dec,
      exceeds_safe_integer: !!result.exceedsSafe
    });
  }

  function clearErrors() {
    for (var i = 0; i < FIELDS.length; i++) {
      if (errors[FIELDS[i]]) errors[FIELDS[i]].textContent = '';
      inputs[FIELDS[i]].setAttribute('aria-invalid', 'false');
    }
  }

  function clearOutputsExcept(source) {
    for (var i = 0; i < FIELDS.length; i++) {
      var f = FIELDS[i];
      if (f !== source) inputs[f].value = '';
    }
    if (safetyNote) safetyNote.hidden = true;
    if (proveBody) proveBody.innerHTML = '<p>Type a value in any field to see the working.</p>';
  }

  function showError(field, message) {
    if (errors[field]) errors[field].textContent = message;
    inputs[field].setAttribute('aria-invalid', 'true');
  }

  function renderProveIt(result) {
    if (!proveBody) return;
    var n = result.decimalBigInt;
    var html = '';
    html += '<p><strong>Canonical decimal value:</strong> <code>' + result.dec + '</code></p>';
    html += '<p>Each base is the same number written with a different alphabet. The page works internally in <code>BigInt</code> so values well past <code>Number.MAX_SAFE_INTEGER</code> (2<sup>53</sup> - 1) round-trip without precision loss.</p>';

    html += '<table class="nbc-prove-table"><thead><tr>' +
      '<th scope="col">Base</th><th scope="col">Value</th><th scope="col">Underlying call</th>' +
      '</tr></thead><tbody>';
    var rows = [
      { base: 2,  label: 'Binary (base 2)',       value: result.bin, call: 'BigInt(' + result.dec + ').toString(2)' },
      { base: 8,  label: 'Octal (base 8)',        value: result.oct, call: 'BigInt(' + result.dec + ').toString(8)' },
      { base: 10, label: 'Decimal (base 10)',     value: result.dec, call: 'BigInt(' + result.dec + ').toString(10)' },
      { base: 16, label: 'Hexadecimal (base 16)', value: result.hex, call: 'BigInt(' + result.dec + ').toString(16)' }
    ];
    for (var r = 0; r < rows.length; r++) {
      html += '<tr><th scope="row">' + rows[r].label + '</th>' +
        '<td><code>' + rows[r].value + '</code></td>' +
        '<td><code>' + rows[r].call + '</code></td></tr>';
    }
    html += '</tbody></table>';

    // Show the long-division trail for the most interesting non-trivial base.
    // Decimal -> hex is the friendliest illustration for a programmer audience.
    var trail = lib.divisionTrail(n, 16, 32);
    if (trail.length > 0 && n > 0n) {
      html += '<h3>Long-division trail to derive the hex digits</h3>';
      html += '<p>Repeatedly divide by 16. Each remainder is the next hex digit, read from <em>bottom up</em>.</p>';
      html += '<table class="nbc-prove-table"><thead><tr>' +
        '<th scope="col">Step</th><th scope="col">Value</th><th scope="col">&divide; 16</th>' +
        '<th scope="col">Quotient</th><th scope="col">Remainder</th><th scope="col">Hex digit</th>' +
        '</tr></thead><tbody>';
      for (var s = 0; s < trail.length; s++) {
        html += '<tr><td>' + (s + 1) + '</td>' +
          '<td><code>' + trail[s].quotientIn + '</code></td>' +
          '<td>16</td>' +
          '<td><code>' + trail[s].quotientOut + '</code></td>' +
          '<td><code>' + trail[s].remainder + '</code></td>' +
          '<td><code>' + trail[s].digit + '</code></td></tr>';
      }
      html += '</tbody></table>';
      html += '<p>Reading the <strong>Hex digit</strong> column from bottom to top gives <code>' + result.hex + '</code>, which matches the value in the hex field.</p>';
    }

    proveBody.innerHTML = html;
  }

  function applyResult(source, result) {
    clearErrors();
    if (!result.ok) {
      showError(source, result.error);
      return;
    }
    if (result.dec === '') {
      // Empty source clears everything.
      clearOutputsExcept(source);
      return;
    }
    for (var i = 0; i < FIELDS.length; i++) {
      var f = FIELDS[i];
      if (f === source) continue;
      inputs[f].value = result[f];
    }
    if (safetyNote) safetyNote.hidden = !result.exceedsSafe;
    renderProveIt(result);
    pushResult(source, result);
  }

  // Standard-base inputs.
  var updating = false;
  function handleStandardInput(source) {
    if (updating) return;
    pushInteraction(source);
    var raw = inputs[source].value;
    var result = lib.convertAll(source, raw);
    updating = true;
    applyResult(source, result);
    updating = false;
  }

  for (var j = 0; j < FIELDS.length; j++) {
    (function (field) {
      inputs[field].addEventListener('input', function () { handleStandardInput(field); });
    })(FIELDS[j]);
  }

  // Arbitrary-base panel.
  function handleArbitrary() {
    if (!arbValue || !arbBase) return;
    pushInteraction('arbitrary');
    var raw = arbValue.value;
    var b = parseInt(arbBase.value, 10);
    if (arbError) arbError.textContent = '';
    arbValue.setAttribute('aria-invalid', 'false');
    arbBase.setAttribute('aria-invalid', 'false');

    if (raw.trim() === '') {
      // Don't disturb the standard fields if nothing is entered.
      return;
    }
    if (!(b >= 2 && b <= 36)) {
      if (arbError) arbError.textContent = 'Base must be a whole number between 2 and 36.';
      arbBase.setAttribute('aria-invalid', 'true');
      return;
    }
    var result = lib.convertAllFromArbitrary(raw, b);
    if (!result.ok) {
      if (arbError) arbError.textContent = result.error;
      arbValue.setAttribute('aria-invalid', 'true');
      return;
    }
    // Push the result into the four standard fields so the user sees the conversion.
    updating = true;
    inputs.bin.value = result.bin;
    inputs.oct.value = result.oct;
    inputs.dec.value = result.dec;
    inputs.hex.value = result.hex;
    updating = false;
    if (safetyNote) safetyNote.hidden = !result.exceedsSafe;
    renderProveIt(result);
    pushResult('arbitrary', result);
  }

  if (arbValue) arbValue.addEventListener('input', handleArbitrary);
  if (arbBase)  arbBase.addEventListener('input', handleArbitrary);

  if (proveIt) {
    proveIt.addEventListener('toggle', function () {
      if (proveIt.open) {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: 'prove_it', calculator_name: CALC_NAME });
      }
    });
  }
})();
