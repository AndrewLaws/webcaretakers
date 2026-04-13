// Calculator interaction and DataLayer event handling

(function () {
  'use strict';

  var calculators = document.querySelectorAll('[data-calculator]');

  calculators.forEach(function (calc) {
    var inputs = calc.querySelectorAll('input, select');
    var form = calc.querySelector('form');
    var resultsArea = calc.querySelector('[data-calculator-results]');

    // Track input interactions
    inputs.forEach(function (input) {
      input.addEventListener('input', function () {
        window.dataLayer.push({
          event: 'calculator_interaction',
          calculator_name: getCalculatorName(calc),
          field_name: input.name || input.id
        });
      });
    });

    // Track calculation results
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var result = calculate(calc);
        if (resultsArea && result !== null) {
          resultsArea.querySelector('.result-display').textContent = result;
          window.dataLayer.push({
            event: 'calculator_result',
            calculator_name: getCalculatorName(calc),
            result_value: result
          });
        }
      });
    }
  });

  // Track CTA clicks
  var ctaBlocks = document.querySelectorAll('[data-cta="next-step"]');
  ctaBlocks.forEach(function (block) {
    block.addEventListener('click', function (e) {
      if (e.target.closest('a, button')) {
        window.dataLayer.push({
          event: 'cta_click',
          cta_type: 'next-step',
          cta_text: e.target.textContent.trim()
        });
      }
    });
  });

  function getCalculatorName(calc) {
    var heading = calc.querySelector('h2, h3');
    return heading ? heading.textContent.trim() : 'unknown';
  }

  // Simple percentage calculator logic for the demo
  function calculate(calc) {
    var percentageInput = calc.querySelector('[name="percentage"]');
    var valueInput = calc.querySelector('[name="value"]');

    if (percentageInput && valueInput) {
      var pct = parseFloat(percentageInput.value);
      var val = parseFloat(valueInput.value);
      if (!isNaN(pct) && !isNaN(val)) {
        return (pct / 100 * val).toFixed(2);
      }
    }
    return null;
  }
})();
