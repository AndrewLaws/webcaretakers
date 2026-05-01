#!/usr/bin/env node
// Pre-render the site search bar at build time.
//
// Why: main.js currently injects the search bar dynamically before
// `<header class="site-header">` after first paint. The bar is ~50px tall, so
// every page suffers a small Cumulative Layout Shift on load (caught at 0.038
// on word-count in the CWV baseline; affects all pages but only catches in
// lab metrics by timing). Pre-rendering the bar in static HTML eliminates the
// shift entirely. The JS injection in main.js already guards with
//   if (document.querySelector('[data-site-search]')) return;
// so once we pre-render, the JS becomes a no-op and the search widget loader
// (search.js) still runs because it is a separate IIFE inside main.js.
//
// Idempotent. Safe to re-run on every build.

const fs = require('node:fs');
const path = require('node:path');

const SITE_ROOT = path.resolve(__dirname, '..', 'site');

// Mirror of the markup that main.js builds. Wrapped with a marker comment so
// future audits can find it.
const SEARCH_BAR_HTML =
  '  <!-- site-search-bar -->\n' +
  '  <div class="site-search-bar">\n' +
  '    <div class="container">\n' +
  '      <form class="site-search" role="search" data-site-search autocomplete="off">\n' +
  '        <label for="site-search-input" class="site-search__label visually-hidden">Search calculators</label>\n' +
  '        <input id="site-search-input" type="search" class="site-search__input" placeholder="Search calculators..." autocomplete="off" data-site-search-input aria-autocomplete="list" aria-controls="site-search-results">\n' +
  '        <ul id="site-search-results" class="site-search__results" data-site-search-results hidden role="listbox"></ul>\n' +
  '      </form>\n' +
  '    </div>\n' +
  '  </div>\n';

function* walkPages(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walkPages(full);
    else if (entry.isFile() && entry.name === 'index.html') yield full;
  }
}

let touched = 0;
let skipped = 0;
const skippedNoHeader = [];
for (const file of walkPages(SITE_ROOT)) {
  const html = fs.readFileSync(file, 'utf8');
  if (html.includes('data-site-search')) {
    skipped++;
    continue;
  }
  // Insert immediately before the site-header so the bar sits above it,
  // matching what main.js was doing.
  const headerRe = /(\s*)<header class="site-header">/;
  const m = html.match(headerRe);
  if (!m) {
    skippedNoHeader.push(file);
    continue;
  }
  const next = html.replace(headerRe, '\n' + SEARCH_BAR_HTML + m[0]);
  fs.writeFileSync(file, next, 'utf8');
  touched++;
}

const rel = (f) => path.relative(path.resolve(__dirname, '..'), f);

console.log(`Pre-rendered search bar on ${touched} pages.`);
console.log(`Skipped ${skipped} pages that already had the bar.`);
if (skippedNoHeader.length) {
  console.log(`Skipped ${skippedNoHeader.length} pages with no .site-header:`);
  for (const f of skippedNoHeader) console.log(`  ! ${rel(f)}`);
}
