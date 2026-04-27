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

// Cookie consent banner: show/hide, accept/reject, focus trap, ESC = reject,
// and a "Manage cookie preferences" footer control that reopens the banner.
//
// The Consent Mode v2 default-denied gtag block stays inline in each page's
// <head> because it must run before GTM loads. Everything below runs after
// the page has rendered.
(function () {
  'use strict';

  var KEY = 'cookie-consent';
  var banner = document.querySelector('[data-cookie-banner]');
  if (!banner) return;

  window.dataLayer = window.dataLayer || [];
  function gtag(){ window.dataLayer.push(arguments); }

  var lastFocusBeforeOpen = null;

  function focusable() {
    return banner.querySelectorAll(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
  }

  function onKeydown(e) {
    if (banner.hidden) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      record('denied');
      return;
    }
    if (e.key !== 'Tab') return;
    var nodes = focusable();
    if (!nodes.length) return;
    var first = nodes[0];
    var last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function open() {
    lastFocusBeforeOpen = document.activeElement;
    banner.hidden = false;
    var reject = banner.querySelector('[data-cookie-reject]');
    var accept = banner.querySelector('[data-cookie-accept]');
    var target = reject || accept;
    if (target) {
      // Defer focus by a tick so the layout has settled.
      setTimeout(function () { target.focus(); }, 0);
    }
    document.addEventListener('keydown', onKeydown, true);
  }

  function close() {
    banner.hidden = true;
    document.removeEventListener('keydown', onKeydown, true);
    if (lastFocusBeforeOpen && typeof lastFocusBeforeOpen.focus === 'function') {
      try { lastFocusBeforeOpen.focus(); } catch (e) {}
    }
  }

  function record(choice) {
    try { localStorage.setItem(KEY, choice); } catch (e) {}
    gtag('consent', 'update', {
      ad_storage: choice,
      analytics_storage: choice,
      ad_user_data: choice,
      ad_personalization: choice
    });
    close();
  }

  // Wire the banner's own controls. Idempotent: per-page inline script may
  // also have wired these, but addEventListener won't double-fire because
  // we call removeEventListener via close() and re-add via open().
  var accept = banner.querySelector('[data-cookie-accept]');
  var reject = banner.querySelector('[data-cookie-reject]');
  if (accept) accept.addEventListener('click', function () { record('granted'); });
  if (reject) reject.addEventListener('click', function () { record('denied'); });

  // Inject the "Manage cookie preferences" control into the footer nav so
  // we don't have to edit every page's HTML.
  var footerNav = document.querySelector('.site-footer-nav ul');
  if (footerNav && !footerNav.querySelector('[data-cookie-manage]')) {
    var li = document.createElement('li');
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'site-footer-nav__cookie-link';
    btn.setAttribute('data-cookie-manage', '');
    btn.textContent = 'Manage cookie preferences';
    btn.addEventListener('click', function () { open(); });
    li.appendChild(btn);
    footerNav.appendChild(li);
  }

  // Show on first visit (no stored choice).
  var stored = null;
  try { stored = localStorage.getItem(KEY); } catch (e) {}
  if (stored !== 'granted' && stored !== 'denied') {
    open();
  }

  // Public API for any other surface that wants to reopen the banner.
  window.WC = window.WC || {};
  window.WC.cookieConsent = { open: open, close: close };
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
