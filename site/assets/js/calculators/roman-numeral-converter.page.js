(function () {
  'use strict';

  var lib = window.RomanNumeralConverter;
  if (!lib) return;

  var CALC_NAME = 'Roman Numeral Converter';

  var numEl   = document.querySelector('[data-rn-number]');
  var romanEl = document.querySelector('[data-rn-roman]');
  var numErr  = document.querySelector('[data-rn-number-error]');
  var romanErr = document.querySelector('[data-rn-roman-error]');
  var resultPanel  = document.querySelector('[data-rn-result]');
  var resultValue  = document.querySelector('[data-rn-result-value]');
  var resultSummary = document.querySelector('[data-rn-result-summary]');
  var copyBtn = document.querySelector('[data-rn-copy]');
  var proveItBody = document.querySelector('[data-prove-it-body]');
  var proveIt = document.querySelector('[data-prove-it]');

  if (!numEl || !romanEl) return;

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
  function pushResult(direction, payload) {
    window.dataLayer = window.dataLayer || [];
    var data = { event: 'calculator_result', calculator_name: CALC_NAME, direction: direction };
    if (payload) for (var k in payload) if (Object.prototype.hasOwnProperty.call(payload, k)) data[k] = payload[k];
    window.dataLayer.push(data);
  }

  function setError(el, msg) {
    el.textContent = msg || '';
    el.classList.toggle('calc-row__hint--error', !!msg);
  }

  function clearResult() {
    resultPanel.hidden = true;
    resultValue.textContent = '';
    resultSummary.textContent = '';
    proveItBody.innerHTML = '<p>Enter a value above to see the step-by-step working.</p>';
  }

  function showResult(value, summary) {
    resultPanel.hidden = false;
    resultValue.textContent = value;
    resultSummary.textContent = summary || '';
  }

  function renderNumberToRomanSteps(n, roman) {
    var steps = lib.numberToRomanSteps(n);
    var html = '';
    html += '<p><strong>Number ' + n + ' to Roman.</strong> Greedy decomposition: subtract the largest token that fits, repeat until the remainder is zero.</p>';
    html += '<ol class="working">';
    for (var i = 0; i < steps.length; i++) {
      var s = steps[i];
      html += '<li>' + s.before + ' &minus; ' + s.value + ' (' + s.token + ') = ' + s.after + '</li>';
    }
    html += '</ol>';
    html += '<p>Reading the tokens off in order gives <code>' + roman + '</code>.</p>';
    return html;
  }

  function renderRomanToNumberSteps(s, total) {
    var steps = lib.romanToNumberSteps(s);
    var upper = s.toUpperCase();
    var html = '';
    html += '<p><strong>Roman ' + upper + ' to number.</strong> Walk left to right. If a symbol is smaller than the next one, subtract it. Otherwise add it.</p>';
    html += '<ol class="working">';
    for (var i = 0; i < steps.length; i++) {
      var st = steps[i];
      if (st.op === 'subtract') {
        html += '<li>' + st.symbol + ' (' + st.value + ') is less than ' + st.nextSymbol + ' (' + st.nextValue + '), so subtract: &minus;' + st.value + '</li>';
      } else {
        html += '<li>' + st.symbol + ' (' + st.value + '), add: +' + st.value + '</li>';
      }
    }
    html += '</ol>';
    html += '<p>Total: <strong>' + total + '</strong>.</p>';
    return html;
  }

  // Source-of-truth flag prevents echo loops between the two inputs.
  var updating = false;

  function fromNumber() {
    if (updating) return;
    var raw = numEl.value.trim();
    setError(numErr, '');
    setError(romanErr, '');

    if (raw === '') {
      updating = true;
      romanEl.value = '';
      updating = false;
      clearResult();
      return;
    }

    // Reject anything that isn't a clean integer.
    if (!/^-?\d+$/.test(raw)) {
      setError(numErr, 'Enter a whole number with no decimals or letters.');
      updating = true;
      romanEl.value = '';
      updating = false;
      clearResult();
      return;
    }

    var n = parseInt(raw, 10);
    try {
      var roman = lib.numberToRoman(n);
      updating = true;
      romanEl.value = roman;
      updating = false;
      showResult(roman, n.toLocaleString('en-GB') + ' written in Roman numerals.');
      proveItBody.innerHTML = renderNumberToRomanSteps(n, roman);
      pushResult('number-to-roman', { input_number: n, output_roman: roman });
    } catch (err) {
      setError(numErr, err.message);
      updating = true;
      romanEl.value = '';
      updating = false;
      clearResult();
    }
  }

  function fromRoman() {
    if (updating) return;
    var raw = romanEl.value.trim();
    setError(numErr, '');
    setError(romanErr, '');

    if (raw === '') {
      updating = true;
      numEl.value = '';
      updating = false;
      clearResult();
      return;
    }

    try {
      var n = lib.romanToNumber(raw);
      updating = true;
      numEl.value = String(n);
      updating = false;
      showResult(String(n), raw.toUpperCase() + ' is ' + n.toLocaleString('en-GB') + '.');
      proveItBody.innerHTML = renderRomanToNumberSteps(raw, n);
      pushResult('roman-to-number', { input_roman: raw.toUpperCase(), output_number: n });
    } catch (err) {
      setError(romanErr, err.message);
      updating = true;
      numEl.value = '';
      updating = false;
      clearResult();
    }
  }

  numEl.addEventListener('input', function () { pushInteraction('number'); fromNumber(); });
  romanEl.addEventListener('input', function () { pushInteraction('roman'); fromRoman(); });

  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var v = resultValue.textContent || '';
      if (!v) return;
      try {
        navigator.clipboard.writeText(v).then(function () {
          var prev = copyBtn.textContent;
          copyBtn.textContent = 'Copied';
          setTimeout(function () { copyBtn.textContent = prev; }, 1200);
        }, function () {});
      } catch (e) {}
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'cta_click', calculator_name: CALC_NAME, action: 'copy_result' });
    });
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
