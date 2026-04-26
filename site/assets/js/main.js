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

// Mobile primary-nav: inject a hamburger toggle into the site header.
// We do this in JS so the per-page HTML doesn't have to change. CSS hides
// the toggle on wider viewports and shows the nav inline as before.
(function () {
  'use strict';
  var header = document.querySelector('.site-header');
  if (!header) return;
  var nav = header.querySelector('.primary-nav');
  if (!nav) return;
  if (header.querySelector('[data-nav-toggle]')) return;

  var toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'site-header__nav-toggle';
  toggle.setAttribute('data-nav-toggle', '');
  toggle.setAttribute('aria-controls', nav.id || 'primary-nav');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Show menu');
  toggle.innerHTML =
    '<span class="site-header__nav-toggle-bars" aria-hidden="true">' +
      '<span></span><span></span><span></span>' +
    '</span>';
  if (!nav.id) nav.id = 'primary-nav';

  // Place the toggle as the last child of the header container so it can
  // float to the right of the logo on mobile.
  var container = header.querySelector('.container') || header;
  container.appendChild(toggle);

  function setOpen(open) {
    header.toggleAttribute('data-nav-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Hide menu' : 'Show menu');
  }

  toggle.addEventListener('click', function () {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  // Close the panel when a link inside the nav is tapped, so navigating
  // categories on mobile feels right.
  nav.addEventListener('click', function (e) {
    if (e.target.closest('a')) setOpen(false);
  });

  // Escape closes the panel.
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setOpen(false);
  });
})();

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

// Sitewide CTA click tracking. Calculator-specific GTM events
// (calculator_interaction, calculator_result) are pushed by each calculator's
// own page script so the calculator_name is accurate and events are not
// duplicated. The previous global [data-calculator] auto-binding was removed
// because it pushed events with the wrong name (panel h2 = "Calculate") and
// duplicated the per-page events.
(function () {
  'use strict';

  window.dataLayer = window.dataLayer || [];

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
})();
