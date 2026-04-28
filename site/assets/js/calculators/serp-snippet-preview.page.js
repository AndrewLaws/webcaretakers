'use strict';

/**
 * Page wiring for the SERP Snippet Preview Tool.
 *
 * The pure measurement and truncation logic lives in
 * serp-snippet-preview.js. This file connects form inputs to that
 * library, manages a hidden canvas for measureText, and updates the
 * desktop and mobile previews on every input.
 */
(function () {
  var lib = window.SerpSnippetPreview;
  if (!lib) return;

  var form = document.getElementById('serp-form');
  if (!form) return;

  var titleIn = document.querySelector('[data-serp-title]');
  var descIn  = document.querySelector('[data-serp-description]');
  var urlIn   = document.querySelector('[data-serp-url]');

  // Desktop nodes.
  var dUrl   = document.querySelector('[data-desktop-url]');
  var dTitle = document.querySelector('[data-desktop-title]');
  var dDesc  = document.querySelector('[data-desktop-description]');
  var dTitleVal = document.querySelector('[data-desktop-title-value]');
  var dDescVal  = document.querySelector('[data-desktop-desc-value]');
  var dWarn  = document.querySelector('[data-desktop-warning]');
  var dTitleMeter = document.querySelector('[data-desktop-title-meter]');
  var dDescMeter  = document.querySelector('[data-desktop-desc-meter]');

  // Mobile nodes.
  var mUrl   = document.querySelector('[data-mobile-url]');
  var mTitle = document.querySelector('[data-mobile-title]');
  var mDesc  = document.querySelector('[data-mobile-description]');
  var mTitleVal = document.querySelector('[data-mobile-title-value]');
  var mDescVal  = document.querySelector('[data-mobile-desc-value]');
  var mWarn  = document.querySelector('[data-mobile-warning]');
  var mTitleMeter = document.querySelector('[data-mobile-title-meter]');
  var mDescMeter  = document.querySelector('[data-mobile-desc-meter]');

  var titleStatus = document.querySelector('[data-title-status]');
  var descStatus  = document.querySelector('[data-desc-status]');
  var proveTitleW = document.querySelector('[data-prove-title-width]');
  var proveTitleB = document.querySelector('[data-prove-title-budget]');
  var proveDetails = document.querySelector('[data-prove-it]');

  // Single shared canvas for all measurements.
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');

  function measure(text, font) {
    if (!text) return 0;
    ctx.font = font;
    return ctx.measureText(String(text)).width;
  }

  // Budget constants. Keeping them named here makes the prove-it panel
  // and the meters share the same source of truth.
  var BUDGETS = {
    desktopTitleFont: '700 20px Arial, sans-serif',
    mobileTitleFont:  '700 20px Arial, sans-serif',
    descFont:         '14px Arial, sans-serif',
    desktopTitle:     600,
    mobileTitle:      580,
    desktopDesc:      990,
    mobileDesc:       1200,
    desktopDescLines: 2,
    mobileDescLines:  3
  };

  var PLACEHOLDER_TITLE = 'Your title appears here';
  var PLACEHOLDER_DESC  = 'Your meta description will appear here.';
  var PLACEHOLDER_URL   = 'example.com';

  var firstInteractionFired = false;
  var firstResultFired = false;
  var debounceTimer = null;

  function fireDataLayer(event, payload) {
    window.dataLayer = window.dataLayer || [];
    var obj = { event: event, calculator_name: 'SERP Snippet Preview Tool' };
    if (payload) {
      for (var k in payload) if (Object.prototype.hasOwnProperty.call(payload, k)) obj[k] = payload[k];
    }
    window.dataLayer.push(obj);
  }

  function setMeterClass(node, ratio, truncated) {
    if (!node) return;
    node.classList.remove('serp-meter--green', 'serp-meter--amber', 'serp-meter--red');
    if (truncated || ratio > 1) node.classList.add('serp-meter--red');
    else if (ratio > 0.92)      node.classList.add('serp-meter--amber');
    else                        node.classList.add('serp-meter--green');
  }

  function renderUrl(input) {
    var crumbs = lib.formatBreadcrumb(input || '');
    if (!crumbs) crumbs = PLACEHOLDER_URL;
    var withChevron = crumbs.split(' > ').join(' \u203A ');
    if (dUrl) dUrl.textContent = withChevron;
    if (mUrl) mUrl.textContent = withChevron;
  }

  function update(field) {
    var titleText = (titleIn.value || '');
    var descText  = (descIn.value  || '');
    var urlText   = (urlIn.value   || '');

    // Track per-field interaction the first time the user touches anything.
    if (!firstInteractionFired) {
      firstInteractionFired = true;
      fireDataLayer('calculator_interaction', { field: field || 'unknown' });
    }

    renderUrl(urlText);

    // Desktop title.
    var dt = lib.analyseTitle(titleText, {
      budget: BUDGETS.desktopTitle, font: BUDGETS.desktopTitleFont
    }, measure);
    dTitle.textContent = titleText ? dt.text : PLACEHOLDER_TITLE;
    if (!titleText) dTitle.classList.add('serp-snippet__title--placeholder');
    else dTitle.classList.remove('serp-snippet__title--placeholder');
    dTitleVal.textContent = Math.round(dt.rawWidth) + ' / ' + BUDGETS.desktopTitle + ' px';
    setMeterClass(dTitleMeter, dt.rawWidth / BUDGETS.desktopTitle, dt.truncated);

    // Mobile title.
    var mt = lib.analyseTitle(titleText, {
      budget: BUDGETS.mobileTitle, font: BUDGETS.mobileTitleFont
    }, measure);
    mTitle.textContent = titleText ? mt.text : PLACEHOLDER_TITLE;
    if (!titleText) mTitle.classList.add('serp-snippet__title--placeholder');
    else mTitle.classList.remove('serp-snippet__title--placeholder');
    mTitleVal.textContent = Math.round(mt.rawWidth) + ' / ' + BUDGETS.mobileTitle + ' px';
    setMeterClass(mTitleMeter, mt.rawWidth / BUDGETS.mobileTitle, mt.truncated);

    // Desktop description.
    var dd = lib.analyseDescription(descText, {
      budget: BUDGETS.desktopDesc, maxLines: BUDGETS.desktopDescLines, font: BUDGETS.descFont
    }, measure);
    dDesc.innerHTML = '';
    if (!descText) {
      dDesc.textContent = PLACEHOLDER_DESC;
      dDesc.classList.add('serp-snippet__description--placeholder');
    } else {
      dDesc.classList.remove('serp-snippet__description--placeholder');
      for (var i = 0; i < dd.lines.length; i++) {
        var ln = document.createElement('div');
        ln.textContent = dd.lines[i];
        dDesc.appendChild(ln);
      }
    }
    dDescVal.textContent = Math.round(dd.rawWidth) + ' / ' + (BUDGETS.desktopDesc * BUDGETS.desktopDescLines) + ' px';
    setMeterClass(dDescMeter, dd.rawWidth / (BUDGETS.desktopDesc * BUDGETS.desktopDescLines), dd.truncated);

    // Mobile description.
    var md = lib.analyseDescription(descText, {
      budget: BUDGETS.mobileDesc, maxLines: BUDGETS.mobileDescLines, font: BUDGETS.descFont
    }, measure);
    mDesc.innerHTML = '';
    if (!descText) {
      mDesc.textContent = PLACEHOLDER_DESC;
      mDesc.classList.add('serp-snippet__description--placeholder');
    } else {
      mDesc.classList.remove('serp-snippet__description--placeholder');
      for (var j = 0; j < md.lines.length; j++) {
        var ln2 = document.createElement('div');
        ln2.textContent = md.lines[j];
        mDesc.appendChild(ln2);
      }
    }
    mDescVal.textContent = Math.round(md.rawWidth) + ' / ' + (BUDGETS.mobileDesc * BUDGETS.mobileDescLines) + ' px';
    setMeterClass(mDescMeter, md.rawWidth / (BUDGETS.mobileDesc * BUDGETS.mobileDescLines), md.truncated);

    // Warnings.
    var dWarnings = [];
    if (dt.truncated) dWarnings.push('Title will be cut off on desktop SERP.');
    if (dd.truncated) dWarnings.push('Description will be cut off on desktop SERP.');
    if (dWarnings.length) { dWarn.hidden = false; dWarn.textContent = dWarnings.join(' '); }
    else { dWarn.hidden = true; dWarn.textContent = ''; }

    var mWarnings = [];
    if (mt.truncated) mWarnings.push('Title will be cut off on mobile SERP.');
    if (md.truncated) mWarnings.push('Description will be cut off on mobile SERP.');
    if (mWarnings.length) { mWarn.hidden = false; mWarn.textContent = mWarnings.join(' '); }
    else { mWarn.hidden = true; mWarn.textContent = ''; }

    // Status hints.
    if (titleStatus) {
      titleStatus.textContent = titleText
        ? ('Desktop ' + Math.round(dt.rawWidth) + ' / ' + BUDGETS.desktopTitle + ' px, mobile ' + Math.round(mt.rawWidth) + ' / ' + BUDGETS.mobileTitle + ' px.')
        : 'Pixel width updates as you type.';
    }
    if (descStatus) {
      descStatus.textContent = descText
        ? ('Desktop ' + Math.round(dd.rawWidth) + ' px (wraps to ' + dd.lines.length + ' line' + (dd.lines.length === 1 ? '' : 's') + '), mobile ' + Math.round(md.rawWidth) + ' px (' + md.lines.length + ' line' + (md.lines.length === 1 ? '' : 's') + ').')
        : 'Description wraps to two lines on desktop and three on mobile.';
    }

    // Prove-it numbers.
    if (proveTitleW) proveTitleW.textContent = String(Math.round(dt.rawWidth));
    if (proveTitleB) proveTitleB.textContent = String(BUDGETS.desktopTitle);

    // Result event the first time real input produces a measurement.
    if (!firstResultFired && (titleText || descText)) {
      firstResultFired = true;
      fireDataLayer('calculator_result', {
        title_pixels: Math.round(dt.rawWidth),
        desc_pixels: Math.round(dd.rawWidth),
        desktop_title_truncated: !!dt.truncated,
        mobile_title_truncated: !!mt.truncated,
        desktop_desc_truncated: !!dd.truncated,
        mobile_desc_truncated: !!md.truncated
      });
    }
  }

  function schedule(field) {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () { update(field); }, 80);
  }

  if (titleIn) titleIn.addEventListener('input', function () { schedule('title'); });
  if (descIn)  descIn.addEventListener('input',  function () { schedule('description'); });
  if (urlIn)   urlIn.addEventListener('input',   function () { schedule('url'); });

  if (proveDetails) {
    proveDetails.addEventListener('toggle', function () {
      if (proveDetails.open) fireDataLayer('prove_it');
    });
  }

  // Initial render with whatever the inputs hold (browser autofill etc.).
  update('init');
})();
