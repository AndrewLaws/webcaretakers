(function () {
  'use strict';

  var lib = window.FuelEconomyConverter;
  if (!lib) return;

  var CALC_NAME = 'Fuel Economy Converter';

  var FIELDS = ['mpgUk', 'mpgUs', 'l100km', 'kml'];

  var inputs = {};
  for (var i = 0; i < FIELDS.length; i++) {
    var f = FIELDS[i];
    inputs[f] = document.querySelector('[data-fec-field="' + f + '"]');
  }
  if (!inputs.mpgUk || !inputs.mpgUs || !inputs.l100km || !inputs.kml) return;

  var proveIt = document.querySelector('[data-prove-it]');

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
  function pushResult(source, results) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'calculator_result',
      calculator_name: CALC_NAME,
      source_field: source,
      mpg_uk: results.mpgUk,
      mpg_us: results.mpgUs,
      l_per_100km: results.l100km,
      km_per_l: results.kml
    });
  }

  function rounders(field, val) {
    if (val === null) return '';
    if (field === 'mpgUk' || field === 'mpgUs') return String(lib.roundMpg(val));
    if (field === 'l100km') return String(lib.roundL100(val));
    if (field === 'kml')    return String(lib.roundKml(val));
    return String(val);
  }

  function markSource(source) {
    for (var i = 0; i < FIELDS.length; i++) {
      var f = FIELDS[i];
      var card = inputs[f].closest('[data-fec-card]');
      if (card) card.classList.toggle('fec-card--source', f === source);
    }
  }

  function clearAllExcept(source) {
    for (var i = 0; i < FIELDS.length; i++) {
      var f = FIELDS[i];
      if (f !== source) inputs[f].value = '';
    }
  }

  // Suppress echo events so writing to the other three inputs does not retrigger.
  var updating = false;

  function handleInput(source) {
    if (updating) return;
    pushInteraction(source);

    var raw = inputs[source].value;
    var results = lib.computeFromField(source, raw);

    markSource(source);

    // Empty / invalid: blank the other three, no error chrome.
    if (results.mpgUk === null) {
      updating = true;
      clearAllExcept(source);
      updating = false;
      return;
    }

    updating = true;
    for (var i = 0; i < FIELDS.length; i++) {
      var f = FIELDS[i];
      if (f === source) continue;
      inputs[f].value = rounders(f, results[f]);
    }
    updating = false;

    pushResult(source, {
      mpgUk: lib.roundMpg(results.mpgUk),
      mpgUs: lib.roundMpg(results.mpgUs),
      l100km: lib.roundL100(results.l100km),
      kml: lib.roundKml(results.kml)
    });
  }

  for (var j = 0; j < FIELDS.length; j++) {
    (function (field) {
      inputs[field].addEventListener('input', function () { handleInput(field); });
    })(FIELDS[j]);
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
