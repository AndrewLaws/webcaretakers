// Site search: inject search bar above the site header on every page, then
// load the search widget. Centralised here so individual HTML files don't
// need to change.
(function () {
  'use strict';
  if (document.querySelector('[data-site-search]')) return; // already on page
  var header = document.querySelector('.site-header');
  if (!header) return;

  var bar = document.createElement('div');
  bar.className = 'site-search-bar';
  bar.innerHTML =
    '<div class="container">' +
      '<form class="site-search" role="search" data-site-search autocomplete="off">' +
        '<label for="site-search-input" class="site-search__label visually-hidden">Search calculators</label>' +
        '<input id="site-search-input" type="search" class="site-search__input" ' +
               'placeholder="Search calculators..." autocomplete="off" ' +
               'data-site-search-input aria-autocomplete="list" aria-controls="site-search-results">' +
        '<ul id="site-search-results" class="site-search__results" data-site-search-results hidden role="listbox"></ul>' +
      '</form>' +
    '</div>';
  header.parentNode.insertBefore(bar, header);

  // Load the widget script once the bar is in place.
  var s = document.createElement('script');
  s.src = '/assets/js/search.js';
  s.defer = true;
  document.head.appendChild(s);
})();

// Calculator interaction and DataLayer event handling

// Primary nav: click-to-toggle submenus (keyboard/mobile).
// Hover and focus-within are handled in CSS, so this only adds click + Escape.
(function () {
  'use strict';
  var toggles = document.querySelectorAll('[data-menu-toggle]');
  if (!toggles.length) return;

  function closeAll(except) {
    toggles.forEach(function (t) {
      if (t !== except) t.setAttribute('aria-expanded', 'false');
    });
  }

  toggles.forEach(function (toggle) {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.addEventListener('click', function (e) {
      e.preventDefault();
      var open = toggle.getAttribute('aria-expanded') === 'true';
      closeAll(open ? null : toggle);
      toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAll(null);
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.primary-nav__item--has-menu')) closeAll(null);
  });
})();

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
