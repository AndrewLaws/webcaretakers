(function () {
  'use strict';

  var lib = window.DecisionWheel;
  if (!lib) return;

  var CALC_NAME = 'Decision Wheel';
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var CX = 200, CY = 200, R = 180;
  var BASE_SPINS = 5;

  var form = document.getElementById('wheel-form');
  var optsEl = document.querySelector('[data-wheel-options]');
  var removeWinnerEl = document.querySelector('[data-wheel-remove-winner]');
  var countEl = document.querySelector('[data-wheel-count]');
  var rotor = document.querySelector('[data-wheel-rotor]');
  var resultEl = document.querySelector('[data-wheel-result]');
  var warningEl = document.querySelector('[data-wheel-warning]');
  var errorEl = document.querySelector('[data-wheel-error]');
  var spinBtn = document.querySelector('[data-wheel-spin]');
  var resetBtn = document.querySelector('[data-wheel-reset]');
  var proveIt = document.querySelector('[data-prove-it]');

  if (!form || !optsEl || !rotor) return;

  var firedInteraction = false;
  var spinning = false;
  var currentRotation = 0; // cumulative rotation applied to the rotor
  var lastOptions = [];

  function pushInteraction(field) {
    if (firedInteraction) return;
    firedInteraction = true;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'calculator_interaction',
      calculator_name: CALC_NAME,
      field: field || ''
    });
  }

  function pushResult(payload) {
    window.dataLayer = window.dataLayer || [];
    var data = { event: 'calculator_result', calculator_name: CALC_NAME };
    if (payload) for (var k in payload) if (Object.prototype.hasOwnProperty.call(payload, k)) data[k] = payload[k];
    window.dataLayer.push(data);
  }

  function clearError() {
    errorEl.hidden = true;
    errorEl.textContent = '';
  }
  function showError(msg) {
    errorEl.hidden = false;
    errorEl.textContent = msg;
  }
  function clearWarning() {
    warningEl.hidden = true;
    warningEl.textContent = '';
  }
  function showWarning(msg) {
    warningEl.hidden = false;
    warningEl.textContent = msg;
  }

  function updateCountHint(parsed) {
    var n = parsed.options.length;
    var msg = n + ' option' + (n === 1 ? '' : 's') + ' entered.';
    if (parsed.truncated) {
      msg += ' List capped at ' + lib.MAX_OPTIONS + '; extra lines ignored.';
    }
    countEl.textContent = msg;
  }

  function clearRotor() {
    while (rotor.firstChild) rotor.removeChild(rotor.firstChild);
  }

  // Approximate label readability: tighter font for many options, no labels
  // beyond a threshold (the wedges are too narrow to read anyway).
  function fontSizeFor(n) {
    if (n <= 6) return 18;
    if (n <= 12) return 14;
    if (n <= 20) return 11;
    if (n <= 30) return 9;
    return 7;
  }

  function renderWheel(options) {
    clearRotor();
    var n = options.length;
    if (n === 0) {
      var empty = document.createElementNS(SVG_NS, 'circle');
      empty.setAttribute('cx', CX);
      empty.setAttribute('cy', CY);
      empty.setAttribute('r', R);
      empty.setAttribute('fill', '#eee');
      empty.setAttribute('stroke', '#1a1a1a');
      empty.setAttribute('stroke-width', '2');
      rotor.appendChild(empty);
      return;
    }

    var slice = 360 / n;
    var fs = fontSizeFor(n);
    var truncateAt = n <= 6 ? 22 : n <= 12 ? 16 : n <= 20 ? 12 : 8;

    for (var i = 0; i < n; i++) {
      var startDeg = i * slice;
      var d = lib.wedgePathD(CX, CY, R, startDeg, slice);
      var path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', d);
      path.setAttribute('fill', 'hsl(' + lib.hueForWedge(i, n) + ', 70%, 65%)');
      path.setAttribute('stroke', '#1a1a1a');
      path.setAttribute('stroke-width', '1');
      path.setAttribute('data-wedge-index', String(i));
      rotor.appendChild(path);

      // Label, placed along the wedge centre line at ~62% radius.
      var centreDeg = lib.wedgeCentreAngle(i, n);
      var rad = ((centreDeg - 90) * Math.PI) / 180;
      var labelR = R * 0.62;
      var lx = CX + labelR * Math.cos(rad);
      var ly = CY + labelR * Math.sin(rad);
      var text = document.createElementNS(SVG_NS, 'text');
      text.setAttribute('x', lx.toFixed(2));
      text.setAttribute('y', ly.toFixed(2));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('class', 'wedge-label');
      text.setAttribute('font-size', String(fs));
      // Rotate the label so it reads radially outward but stays upright-ish.
      text.setAttribute('transform', 'rotate(' + centreDeg.toFixed(2) + ' ' + lx.toFixed(2) + ' ' + ly.toFixed(2) + ')');
      var label = options[i];
      if (label.length > truncateAt) label = label.slice(0, truncateAt - 1) + '…';
      text.textContent = label;
      rotor.appendChild(text);
    }

    // Outer ring for finish.
    var ring = document.createElementNS(SVG_NS, 'circle');
    ring.setAttribute('cx', CX);
    ring.setAttribute('cy', CY);
    ring.setAttribute('r', R);
    ring.setAttribute('fill', 'none');
    ring.setAttribute('stroke', '#1a1a1a');
    ring.setAttribute('stroke-width', '2');
    rotor.appendChild(ring);
  }

  function syncFromTextarea() {
    var parsed = lib.parseOptions(optsEl.value);
    updateCountHint(parsed);
    lastOptions = parsed.options.slice();
    renderWheel(lastOptions);
    return parsed;
  }

  function prefersReducedMotion() {
    return typeof window.matchMedia === 'function' &&
           window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function announce(winner, opts) {
    resultEl.innerHTML = '';
    var label = document.createElement('span');
    label.textContent = 'The wheel chose: ';
    var strong = document.createElement('strong');
    strong.textContent = winner;
    strong.setAttribute('data-wheel-winner', '');
    resultEl.appendChild(label);
    resultEl.appendChild(strong);
  }

  function spin() {
    if (spinning) return;
    clearError();
    clearWarning();

    var parsed = lib.parseOptions(optsEl.value);
    var options = parsed.options;
    updateCountHint(parsed);

    var v = lib.validateSpin(options);
    if (!v.ok) {
      showError(v.message);
      return;
    }

    // Re-render in case the textarea changed since last render.
    renderWheel(options);

    if (options.length === 1) {
      showWarning(v.warning);
      announce(options[0], options);
      pushResult({ option_count: 1, winner: options[0], remove_winner: !!removeWinnerEl.checked });
      if (removeWinnerEl.checked) {
        // Remove the only option from the textarea so the next spin is empty.
        optsEl.value = '';
        syncFromTextarea();
      }
      return;
    }

    var winnerIndex;
    try {
      winnerIndex = lib.pickWinnerIndex(options);
    } catch (e) {
      showError(e.message || 'Could not pick from this list.');
      return;
    }
    var winner = options[winnerIndex];

    // Choreograph the animation to land on winnerIndex.
    var delta = lib.computeFinalRotation(winnerIndex, options.length, BASE_SPINS);
    // Add a small random offset within the wedge for natural variation.
    var slice = 360 / options.length;
    var jitter = (Math.random() - 0.5) * (slice * 0.6);
    var target = currentRotation + delta + jitter;

    spinning = true;
    spinBtn.disabled = true;

    var reduced = prefersReducedMotion();
    rotor.classList.remove('is-spinning');
    // Force a reflow so the next class add starts a fresh transition.
    // eslint-disable-next-line no-unused-expressions
    rotor.getBoundingClientRect();

    if (reduced) {
      rotor.style.transition = 'transform 0.4s linear';
    } else {
      rotor.style.transition = '';
      rotor.classList.add('is-spinning');
    }
    rotor.style.transform = 'rotate(' + target + 'deg)';
    currentRotation = target;

    var settled = false;
    function onEnd() {
      if (settled) return;
      settled = true;
      rotor.removeEventListener('transitionend', onEnd);
      spinning = false;
      spinBtn.disabled = false;
      announce(winner, options);
      pushResult({
        option_count: options.length,
        winner: winner,
        winner_index: winnerIndex,
        remove_winner: !!removeWinnerEl.checked
      });
      if (removeWinnerEl.checked) {
        var remaining = lib.removeAt(options, winnerIndex);
        optsEl.value = remaining.join('\n');
        syncFromTextarea();
      }
    }
    rotor.addEventListener('transitionend', onEnd);
    // Fallback in case transitionend does not fire (e.g. reduced motion edge cases).
    setTimeout(onEnd, reduced ? 600 : 4000);
  }

  function reset() {
    clearError();
    clearWarning();
    rotor.classList.remove('is-spinning');
    rotor.style.transition = 'transform 0s linear';
    rotor.style.transform = 'rotate(0deg)';
    currentRotation = 0;
    resultEl.textContent = 'Add some options and hit Spin.';
    syncFromTextarea();
  }

  optsEl.addEventListener('input', function () {
    pushInteraction('options');
    syncFromTextarea();
  });
  removeWinnerEl.addEventListener('change', function () {
    pushInteraction('remove_winner');
  });

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    spin();
  });
  resetBtn.addEventListener('click', function () { reset(); });

  if (proveIt) {
    proveIt.addEventListener('toggle', function () {
      if (proveIt.open) {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: 'prove_it', calculator_name: CALC_NAME });
      }
    });
  }

  // Initial render.
  syncFromTextarea();
})();
