(function () {
  'use strict';

  var lib = window.AspectRatioCalculator;
  if (!lib) return;

  var CALC_NAME = 'Aspect Ratio Calculator';

  var owEl = document.querySelector('[data-ar-original-w]');
  var ohEl = document.querySelector('[data-ar-original-h]');
  var twEl = document.querySelector('[data-ar-target-w]');
  var thEl = document.querySelector('[data-ar-target-h]');
  var errEl = document.querySelector('[data-ar-error]');
  var ratioEl = document.querySelector('[data-ar-ratio]');
  var presetWrap = document.querySelector('[data-ar-presets]');
  var proveIt = document.querySelector('[data-prove-it]');
  var proveItBody = document.querySelector('[data-prove-it-body]');

  if (!owEl || !ohEl || !twEl || !thEl) return;

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
    if (!errEl) return;
    errEl.textContent = msg || '';
    errEl.classList.toggle('calc-row__hint--error', !!msg);
  }

  function readInt(el) {
    var raw = (el.value || '').trim();
    if (raw === '') return null;
    if (!/^-?\d+$/.test(raw)) return NaN;
    return parseInt(raw, 10);
  }

  // Render the simplified ratio strip and prove-it body for the current
  // original dimensions and (optionally) a derived target.
  function renderRatio(ow, oh, target) {
    if (ratioEl) {
      try {
        var simp = lib.simplifyRatio(ow, oh);
        ratioEl.textContent = simp.w + ':' + simp.h;
      } catch (e) {
        ratioEl.textContent = '';
      }
    }
    if (proveItBody) {
      try {
        var s = lib.simplifyRatio(ow, oh);
        var html = '';
        html += '<p><strong>Original ratio:</strong> ' + ow + ' &times; ' + oh + '.</p>';
        html += '<p><strong>GCD(' + ow + ', ' + oh + ') = ' + s.divisor + '</strong>, ';
        html += 'so the simplified ratio is ' + s.w + ':' + s.h + ' ';
        html += '(' + ow + ' &divide; ' + s.divisor + ' = ' + s.w + ', ' + oh + ' &divide; ' + s.divisor + ' = ' + s.h + ').</p>';
        if (target) {
          html += '<p><strong>Scale factor:</strong> ' + target.scale.toFixed(6) + '. ';
          html += 'Target ' + (target.from === 'width' ? 'width' : 'height') + ' ' + target.input + ' &divide; original ' + (target.from === 'width' ? ow : oh) + ' = ' + target.scale.toFixed(6) + '.</p>';
          html += '<p><strong>Derived ' + (target.from === 'width' ? 'height' : 'width') + ':</strong> ';
          if (target.from === 'width') {
            html += oh + ' &times; ' + target.scale.toFixed(6) + ' = ' + (oh * target.scale).toFixed(4) + ', rounded to <strong>' + lib.roundDim(oh * target.scale) + '</strong>.</p>';
          } else {
            html += ow + ' &times; ' + target.scale.toFixed(6) + ' = ' + (ow * target.scale).toFixed(4) + ', rounded to <strong>' + lib.roundDim(ow * target.scale) + '</strong>.</p>';
          }
        } else {
          html += '<p>Enter a target width or target height to see the scale factor and the derived dimension.</p>';
        }
        proveItBody.innerHTML = html;
      } catch (e) {
        proveItBody.innerHTML = '<p>Enter valid original dimensions to see the working.</p>';
      }
    }
  }

  // Source-of-truth flag prevents echo loops between the two target inputs.
  var updating = false;

  function recompute(driver) {
    if (updating) return;
    setError('');

    var ow = readInt(owEl);
    var oh = readInt(ohEl);
    var tw = readInt(twEl);
    var th = readInt(thEl);

    // Quick syntactic checks before running the maths.
    var anyBadParse = [ow, oh, tw, th].some(function (v) { return Number.isNaN(v); });
    if (anyBadParse) {
      setError('Use whole numbers only. No decimals, letters or symbols.');
      return;
    }
    if (ow !== null && (ow <= 0)) { setError('Original width must be a positive number, greater than zero.'); return; }
    if (oh !== null && (oh <= 0)) { setError('Original height must be a positive number, greater than zero.'); return; }

    if (ow === null || oh === null) {
      // Need both originals to do anything useful.
      if (ratioEl) ratioEl.textContent = '';
      if (proveItBody) proveItBody.innerHTML = '<p>Enter the original width and height to see the simplified ratio and the working.</p>';
      return;
    }

    // Render the ratio first; even without a target this is useful.
    try { lib.simplifyRatio(ow, oh); }
    catch (err) { setError(err.message); return; }

    var target = null;

    if (driver === 'target-w' && tw !== null && tw > 0) {
      try {
        var rW = lib.scaleFromWidth(ow, oh, tw);
        updating = true;
        thEl.value = String(lib.roundDim(rW.height));
        updating = false;
        target = { from: 'width', input: tw, scale: rW.scale };
        pushResult({ original_w: ow, original_h: oh, target_w: tw, derived_h: lib.roundDim(rW.height) });
      } catch (err) { setError(err.message); }
    } else if (driver === 'target-h' && th !== null && th > 0) {
      try {
        var rH = lib.scaleFromHeight(ow, oh, th);
        updating = true;
        twEl.value = String(lib.roundDim(rH.width));
        updating = false;
        target = { from: 'height', input: th, scale: rH.scale };
        pushResult({ original_w: ow, original_h: oh, target_h: th, derived_w: lib.roundDim(rH.width) });
      } catch (err) { setError(err.message); }
    } else {
      // Original dims changed. If a target was set, re-derive its partner.
      if (tw !== null && tw > 0) {
        try {
          var r1 = lib.scaleFromWidth(ow, oh, tw);
          updating = true;
          thEl.value = String(lib.roundDim(r1.height));
          updating = false;
          target = { from: 'width', input: tw, scale: r1.scale };
        } catch (err) { setError(err.message); }
      } else if (th !== null && th > 0) {
        try {
          var r2 = lib.scaleFromHeight(ow, oh, th);
          updating = true;
          twEl.value = String(lib.roundDim(r2.width));
          updating = false;
          target = { from: 'height', input: th, scale: r2.scale };
        } catch (err) { setError(err.message); }
      }
    }

    renderRatio(ow, oh, target);
  }

  owEl.addEventListener('input', function () { pushInteraction('original-w'); recompute('original'); });
  ohEl.addEventListener('input', function () { pushInteraction('original-h'); recompute('original'); });
  twEl.addEventListener('input', function () { pushInteraction('target-w'); recompute('target-w'); });
  thEl.addEventListener('input', function () { pushInteraction('target-h'); recompute('target-h'); });

  // Presets: apply ratio to whichever target dimension already has a value.
  // Default to using target width as the anchor when both are blank.
  if (presetWrap) {
    presetWrap.addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-ar-preset]');
      if (!btn) return;
      var label = btn.getAttribute('data-ar-preset');
      var preset = lib.PRESETS.find(function (p) { return p.label === label; });
      if (!preset) return;

      // Set originals to the preset's canonical W:H so the ratio is exact.
      updating = true;
      owEl.value = String(preset.w);
      ohEl.value = String(preset.h);
      updating = false;

      // Anchor on whichever target has a value already; default to width.
      var tw = readInt(twEl);
      var th = readInt(thEl);
      if (tw !== null && tw > 0) {
        recompute('target-w');
      } else if (th !== null && th > 0) {
        recompute('target-h');
      } else {
        recompute('original');
      }
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'cta_click', calculator_name: CALC_NAME, action: 'preset', preset: label });
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

  // Initial render: if defaults are present, populate the ratio strip.
  recompute('original');
})();
