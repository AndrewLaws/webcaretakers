(function () {
  'use strict';

  // Volume base unit: millilitre
  // Convention-dependent units (cup, tbsp, tsp) are resolved at convert time.
  var VOL_FIXED = {
    'millilitre':   { label: 'millilitres (ml)', ml: 1 },
    'litre':        { label: 'litres (l)', ml: 1000 },
    'us-cup':       { label: 'US cup (240 ml)', ml: 240 },
    'metric-cup':   { label: 'Metric cup (250 ml)', ml: 250 },
    'uk-imperial-cup': { label: 'UK imperial cup (284 ml, historic)', ml: 284.131 },
    'us-fl-oz':     { label: 'US fluid ounce', ml: 29.5735 },
    'uk-fl-oz':     { label: 'UK fluid ounce', ml: 28.4131 },
    'us-tbsp':      { label: 'US tablespoon (14.79 ml)', ml: 14.7868 },
    'uk-tbsp':      { label: 'UK tablespoon (17.76 ml)', ml: 17.7582 },
    'metric-tbsp':  { label: 'Metric tablespoon (15 ml)', ml: 15 },
    'us-tsp':       { label: 'US teaspoon (4.93 ml)', ml: 4.92892 },
    'uk-tsp':       { label: 'UK teaspoon (5.92 ml)', ml: 5.91939 },
    'metric-tsp':   { label: 'Metric teaspoon (5 ml)', ml: 5 },
    'us-pint':      { label: 'US pint (473 ml)', ml: 473.176 },
    'uk-pint':      { label: 'UK pint (568 ml)', ml: 568.261 },
    'us-quart':     { label: 'US quart', ml: 946.353 },
    'uk-quart':     { label: 'UK quart', ml: 1136.52 },
    'us-gallon':    { label: 'US gallon', ml: 3785.41 },
    'uk-gallon':    { label: 'UK gallon', ml: 4546.09 }
  };

  // Convention-dependent shortcuts: "cup", "tbsp", "tsp" resolve based on convention.
  var CONVENTION_ML = {
    metric: { cup: 250, tbsp: 15, tsp: 5 },
    us:     { cup: 240, tbsp: 14.7868, tsp: 4.92892 },
    uk:     { cup: 250, tbsp: 17.7582, tsp: 5.91939 }
  };

  var VOL_OPTIONS_ORDER = [
    'millilitre','litre',
    'metric-cup','us-cup','uk-imperial-cup',
    'metric-tbsp','us-tbsp','uk-tbsp',
    'metric-tsp','us-tsp','uk-tsp',
    'us-fl-oz','uk-fl-oz',
    'us-pint','uk-pint',
    'us-quart','uk-quart',
    'us-gallon','uk-gallon'
  ];

  var WEIGHT_TO_G = {
    'gram': 1,
    'kilogram': 1000,
    'ounce': 28.3495,
    'pound': 453.592,
    'us-stick': 113
  };
  var WEIGHT_LABEL = {
    'gram': 'grams',
    'kilogram': 'kilograms',
    'ounce': 'ounces',
    'pound': 'pounds',
    'us-stick': 'sticks of butter'
  };

  // Ingredient densities in grams per millilitre (approx).
  // Sources: King Arthur Baking Company ingredient weight chart, cross-referenced
  // with BBC Good Food. Treat as central estimates with roughly +/- 5% spread.
  var INGREDIENTS = {
    'plain-flour':         { name: 'plain flour', gPerMl: 0.52 },
    'self-raising-flour':  { name: 'self-raising flour', gPerMl: 0.52 },
    'granulated-sugar':    { name: 'granulated sugar', gPerMl: 0.84 },
    'caster-sugar':        { name: 'caster sugar', gPerMl: 0.84 },
    'brown-sugar':         { name: 'brown sugar (packed)', gPerMl: 0.90 },
    'icing-sugar':         { name: 'icing sugar', gPerMl: 0.50 },
    'butter':              { name: 'butter', gPerMl: 0.9458 },
    'rolled-oats':         { name: 'rolled oats', gPerMl: 0.38 },
    'rice':                { name: 'rice (uncooked)', gPerMl: 0.80 },
    'honey':               { name: 'honey', gPerMl: 1.42 },
    'milk':                { name: 'milk', gPerMl: 1.03 },
    'water':               { name: 'water', gPerMl: 1.00 }
  };

  function fmt(n) {
    if (!isFinite(n)) return String(n);
    var a = Math.abs(n);
    var d;
    if (a === 0) d = 0;
    else if (a >= 1000) d = 1;
    else if (a >= 10) d = 2;
    else if (a >= 1) d = 3;
    else d = 4;
    return parseFloat(n.toFixed(d)).toLocaleString('en-GB', { maximumFractionDigits: d });
  }

  var firedInteraction = false;
  function pushInteraction(field) {
    window.dataLayer = window.dataLayer || [];
    if (!firedInteraction) {
      firedInteraction = true;
      window.dataLayer.push({
        event: 'calculator_interaction',
        calculator_name: 'Cooking Measurements Converter',
        field_name: field || ''
      });
    }
  }
  function pushResult(kind, payload) {
    window.dataLayer = window.dataLayer || [];
    var data = { event: 'calculator_result', calculator_name: 'Cooking Measurements Converter', conversion_type: kind };
    if (payload) {
      for (var k in payload) if (Object.prototype.hasOwnProperty.call(payload, k)) data[k] = payload[k];
    }
    window.dataLayer.push(data);
  }

  function getConvention() {
    var sel = document.querySelector('[data-cup-convention]');
    return sel ? sel.value : 'metric';
  }

  // Build volume from/to selects, expanding cup/tbsp/tsp labels per current convention.
  function buildVolumeOptions() {
    var fromEl = document.querySelector('[data-vol-from]');
    var toEl   = document.querySelector('[data-vol-to]');
    if (!fromEl || !toEl) return;
    var prevFrom = fromEl.value;
    var prevTo   = toEl.value;
    fromEl.innerHTML = '';
    toEl.innerHTML = '';
    for (var i = 0; i < VOL_OPTIONS_ORDER.length; i++) {
      var key = VOL_OPTIONS_ORDER[i];
      var unit = VOL_FIXED[key];
      var optF = document.createElement('option');
      optF.value = key; optF.textContent = unit.label;
      fromEl.appendChild(optF);
      var optT = document.createElement('option');
      optT.value = key; optT.textContent = unit.label;
      toEl.appendChild(optT);
    }
    fromEl.value = prevFrom || 'metric-cup';
    toEl.value   = prevTo   || 'millilitre';
  }

  function volToMl(key, value) {
    var u = VOL_FIXED[key];
    if (!u) return NaN;
    return value * u.ml;
  }

  function runVolume() {
    var v = parseFloat(document.querySelector('[data-vol-value]').value);
    var fromKey = document.querySelector('[data-vol-from]').value;
    var toKey   = document.querySelector('[data-vol-to]').value;
    var out = document.querySelector('[data-vol-result]');
    if (!isFinite(v)) { out.innerHTML = '&mdash;'; return; }
    var ml = volToMl(fromKey, v);
    var toMl = VOL_FIXED[toKey].ml;
    var result = ml / toMl;
    out.textContent = fmt(v) + ' ' + VOL_FIXED[fromKey].label + ' = ' + fmt(result) + ' ' + VOL_FIXED[toKey].label;
    pushResult('volume', { from: fromKey, to: toKey });
  }

  function runWeight() {
    var v = parseFloat(document.querySelector('[data-wt-value]').value);
    var fromKey = document.querySelector('[data-wt-from]').value;
    var toKey   = document.querySelector('[data-wt-to]').value;
    var out = document.querySelector('[data-wt-result]');
    if (!isFinite(v)) { out.innerHTML = '&mdash;'; return; }
    var grams = v * WEIGHT_TO_G[fromKey];
    var result = grams / WEIGHT_TO_G[toKey];
    out.textContent = fmt(v) + ' ' + WEIGHT_LABEL[fromKey] + ' = ' + fmt(result) + ' ' + WEIGHT_LABEL[toKey];
    pushResult('weight', { from: fromKey, to: toKey });
  }

  // Gas mark to celsius mapping (conventional oven).
  var GAS_TABLE = [
    { gm: 0.25, c: 110 },
    { gm: 0.5,  c: 120 },
    { gm: 1,    c: 140 },
    { gm: 2,    c: 150 },
    { gm: 3,    c: 170 },
    { gm: 4,    c: 180 },
    { gm: 5,    c: 190 },
    { gm: 6,    c: 200 },
    { gm: 7,    c: 220 },
    { gm: 8,    c: 230 },
    { gm: 9,    c: 240 }
  ];

  function celsiusToGas(c) {
    // Find nearest gas mark by celsius.
    var best = GAS_TABLE[0];
    var bestDiff = Math.abs(c - best.c);
    for (var i = 1; i < GAS_TABLE.length; i++) {
      var d = Math.abs(c - GAS_TABLE[i].c);
      if (d < bestDiff) { bestDiff = d; best = GAS_TABLE[i]; }
    }
    return best.gm;
  }
  function gasToCelsius(g) {
    // Match exact, or interpolate to nearest.
    for (var i = 0; i < GAS_TABLE.length; i++) {
      if (Math.abs(GAS_TABLE[i].gm - g) < 0.01) return GAS_TABLE[i].c;
    }
    // Out of range: clamp to nearest.
    if (g < GAS_TABLE[0].gm) return GAS_TABLE[0].c;
    if (g > GAS_TABLE[GAS_TABLE.length - 1].gm) return GAS_TABLE[GAS_TABLE.length - 1].c;
    // Otherwise interpolate.
    for (var j = 0; j < GAS_TABLE.length - 1; j++) {
      var a = GAS_TABLE[j], b = GAS_TABLE[j+1];
      if (g >= a.gm && g <= b.gm) {
        var t = (g - a.gm) / (b.gm - a.gm);
        return a.c + t * (b.c - a.c);
      }
    }
    return null;
  }

  function runTemperature() {
    var v = parseFloat(document.querySelector('[data-temp-value]').value);
    var fromKey = document.querySelector('[data-temp-from]').value;
    var toKey   = document.querySelector('[data-temp-to]').value;
    var out = document.querySelector('[data-temp-result]');
    if (!isFinite(v)) { out.innerHTML = '&mdash;'; return; }

    // First convert input to celsius.
    var c;
    if (fromKey === 'celsius')        c = v;
    else if (fromKey === 'fahrenheit') c = (v - 32) * 5 / 9;
    else if (fromKey === 'gas-mark')   c = gasToCelsius(v);

    if (c == null || !isFinite(c)) { out.innerHTML = '&mdash;'; return; }

    var label, value;
    if (toKey === 'celsius')          { value = Math.round(c); label = '\u00B0C'; }
    else if (toKey === 'fahrenheit')  { value = Math.round(c * 9 / 5 + 32); label = '\u00B0F'; }
    else if (toKey === 'gas-mark')    {
      var gm = celsiusToGas(c);
      value = gm < 1 ? (gm === 0.25 ? '1/4' : '1/2') : gm;
      label = '(gas mark)';
    }

    var fromLabel = fromKey === 'celsius' ? '\u00B0C' : (fromKey === 'fahrenheit' ? '\u00B0F' : '(gas mark)');
    out.textContent = v + ' ' + fromLabel + ' = ' + value + ' ' + label;
    pushResult('temperature', { from: fromKey, to: toKey });
  }

  function runIngredient() {
    var cups = parseFloat(document.querySelector('[data-ing-cups]').value);
    var key = document.querySelector('[data-ing-ingredient]').value;
    var out = document.querySelector('[data-ing-result]');
    var detail = document.querySelector('[data-ing-detail]');
    if (!isFinite(cups) || !INGREDIENTS[key]) { out.innerHTML = '&mdash;'; if (detail) detail.textContent = ''; return; }
    var conv = getConvention();
    var cupMl = CONVENTION_ML[conv].cup;
    var ing = INGREDIENTS[key];
    var grams = cups * cupMl * ing.gPerMl;
    out.textContent = fmt(cups) + ' cup' + (cups === 1 ? '' : 's') + ' of ' + ing.name + ' \u2248 ' + Math.round(grams) + ' g';
    if (detail) {
      detail.textContent = 'Using a ' + cupMl + ' ml cup (' + conv + ' convention). Density assumed ' + ing.gPerMl + ' g/ml. Real-world weight can vary by roughly \u00B15% with packing and humidity.';
    }
    pushResult('ingredient', { ingredient: key, convention: conv });
  }

  // Prove-it: rebuild a step list from the current inputs each time anything changes.
  function buildProveSteps() {
    var steps = [];
    var conv = getConvention();

    // Volume
    try {
      var vEl = document.querySelector('[data-vol-value]');
      var vFromEl = document.querySelector('[data-vol-from]');
      var vToEl = document.querySelector('[data-vol-to]');
      if (vEl && vFromEl && vToEl) {
        var v = parseFloat(vEl.value);
        if (isFinite(v)) {
          var fromMl = VOL_FIXED[vFromEl.value].ml;
          var toMl = VOL_FIXED[vToEl.value].ml;
          var inMl = v * fromMl;
          var out = inMl / toMl;
          steps.push('Volume: ' + fmt(v) + ' &times; ' + fromMl + ' ml = ' + fmt(inMl) + ' ml, then &divide; ' + toMl + ' ml = ' + fmt(out) + ' ' + VOL_FIXED[vToEl.value].label + '.');
        }
      }
    } catch (e) {}

    // Weight
    try {
      var wEl = document.querySelector('[data-wt-value]');
      var wFromEl = document.querySelector('[data-wt-from]');
      var wToEl = document.querySelector('[data-wt-to]');
      if (wEl && wFromEl && wToEl) {
        var w = parseFloat(wEl.value);
        if (isFinite(w)) {
          var fromG = WEIGHT_TO_G[wFromEl.value];
          var toG = WEIGHT_TO_G[wToEl.value];
          var grams = w * fromG;
          var wOut = grams / toG;
          steps.push('Weight: ' + fmt(w) + ' &times; ' + fromG + ' g = ' + fmt(grams) + ' g, then &divide; ' + toG + ' g = ' + fmt(wOut) + ' ' + WEIGHT_LABEL[wToEl.value] + '.');
        }
      }
    } catch (e) {}

    // Temperature
    try {
      var tEl = document.querySelector('[data-temp-value]');
      var tFromEl = document.querySelector('[data-temp-from]');
      var tToEl = document.querySelector('[data-temp-to]');
      if (tEl && tFromEl && tToEl) {
        var tv = parseFloat(tEl.value);
        if (isFinite(tv)) {
          var fk = tFromEl.value, tk = tToEl.value;
          var c;
          if (fk === 'celsius') c = tv;
          else if (fk === 'fahrenheit') c = (tv - 32) * 5 / 9;
          else c = gasToCelsius(tv);
          var step = 'Temperature: ';
          if (fk === 'celsius') step += tv + ' &deg;C';
          else if (fk === 'fahrenheit') step += '(' + tv + ' &minus; 32) &times; 5/9 = ' + fmt(c) + ' &deg;C';
          else step += 'gas mark ' + tv + ' &asymp; ' + fmt(c) + ' &deg;C (UK gas oven scale)';
          if (tk === 'celsius') step += ' &rarr; ' + Math.round(c) + ' &deg;C.';
          else if (tk === 'fahrenheit') step += ' &rarr; ' + fmt(c) + ' &times; 9/5 + 32 = ' + Math.round(c * 9 / 5 + 32) + ' &deg;F.';
          else step += ' &rarr; gas mark ' + celsiusToGas(c) + '.';
          steps.push(step);
        }
      }
    } catch (e) {}

    // Ingredient
    try {
      var iEl = document.querySelector('[data-ing-cups]');
      var iSel = document.querySelector('[data-ing-ingredient]');
      if (iEl && iSel) {
        var cups = parseFloat(iEl.value);
        var ing = INGREDIENTS[iSel.value];
        if (isFinite(cups) && ing) {
          var cupMl = CONVENTION_ML[conv].cup;
          var ml = cups * cupMl;
          var grams2 = ml * ing.gPerMl;
          steps.push('Ingredient: ' + fmt(cups) + ' cup &times; ' + cupMl + ' ml (' + conv + ' cup) = ' + fmt(ml) + ' ml, then &times; ' + ing.gPerMl + ' g/ml (' + ing.name + ') &asymp; ' + Math.round(grams2) + ' g.');
        }
      }
    } catch (e) {}

    return steps;
  }

  function renderProveIt() {
    var ol = document.querySelector('[data-prove-steps]');
    if (!ol) return;
    var steps = buildProveSteps();
    ol.innerHTML = steps.map(function (s) { return '<li>' + s + '</li>'; }).join('');
  }

  function bindProveIt() {
    var btn = document.querySelector('[data-prove-it]');
    var body = document.querySelector('[data-prove-body]');
    if (!btn || !body) return;
    btn.addEventListener('click', function () {
      var open = body.hidden;
      body.hidden = !open;
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'calculator_interaction',
        action: 'prove_it',
        calculator_name: 'Cooking Measurements Converter'
      });
    });
  }

  function bindAll() {
    var allEls = document.querySelectorAll(
      '[data-vol-value],[data-vol-from],[data-vol-to],' +
      '[data-wt-value],[data-wt-from],[data-wt-to],' +
      '[data-temp-value],[data-temp-from],[data-temp-to],' +
      '[data-ing-cups],[data-ing-ingredient],[data-cup-convention]'
    );
    allEls.forEach(function (el) {
      var handler = function () {
        pushInteraction(el.getAttribute('id') || '');
        runVolume();
        runWeight();
        runTemperature();
        runIngredient();
        renderProveIt();
      };
      el.addEventListener('input', handler);
      el.addEventListener('change', handler);
    });

    // Related calculators CTA tracking
    document.querySelectorAll('.related-calculators a').forEach(function (a) {
      a.addEventListener('click', function () {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          event: 'cta_click',
          calculator_name: 'Cooking Measurements Converter',
          cta_target: a.getAttribute('href')
        });
      });
    });
  }

  function init() {
    buildVolumeOptions();
    bindAll();
    bindProveIt();
    runVolume();
    runWeight();
    runTemperature();
    runIngredient();
    renderProveIt();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
