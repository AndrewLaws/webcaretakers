#!/usr/bin/env node
// Sweep prove-it dataLayer assertions and inject a waitForFunction so the
// `toggle` event has fired before we read window.dataLayer. Without this,
// the assertion races the async event handler and flakes in headless Chromium.
//
// Pattern targeted:
//   await ...summary...click(...);
//   ... (within next ~6 lines) ...
//   const event = await page.evaluate(() => window.dataLayer.find(... 'prove_it' ...));
//
// Inserts immediately before the `page.evaluate` line:
//   await page.waitForFunction(() => window.dataLayer.some((e) => e.event === 'prove_it'));
'use strict';

const fs = require('fs');
const path = require('path');

const TESTS_DIR = path.join(__dirname, '..', 'tests');
const files = fs.readdirSync(TESTS_DIR).filter((f) => f.endsWith('.spec.js'));

let totalPatched = 0;
let filesPatched = 0;

for (const file of files) {
  const fullPath = path.join(TESTS_DIR, file);
  const original = fs.readFileSync(fullPath, 'utf8');
  if (!/prove_it/.test(original)) continue;

  const lines = original.split('\n');
  const out = [];
  let patched = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect the prove_it dataLayer read (find or some), and only patch when
    // there is no waitForFunction within the previous 6 lines.
    const isProveItRead = /page\.evaluate\(.*\)\s*=>?/.test(line) &&
      /window\.dataLayer\.(find|some)/.test(lines[i] + (lines[i + 1] || '') + (lines[i + 2] || '')) &&
      ((lines[i] + (lines[i + 1] || '') + (lines[i + 2] || '')).match(/'prove_it'|"prove_it"/));

    if (isProveItRead) {
      // Look backwards a few lines for an existing waitForFunction guarding prove_it.
      let alreadyGuarded = false;
      for (let j = Math.max(0, i - 6); j < i; j++) {
        if (/waitForFunction.*prove_it|prove_it.*waitForFunction/.test(lines[j] + (lines[j + 1] || '') + (lines[j + 2] || ''))) {
          alreadyGuarded = true;
          break;
        }
      }

      if (!alreadyGuarded) {
        // Capture the indent of the current line so the inserted line aligns.
        const indent = (line.match(/^(\s*)/) || ['', ''])[1];
        out.push(`${indent}await page.waitForFunction(() => window.dataLayer.some((e) => e.event === 'prove_it'));`);
        patched++;
      }
    }

    out.push(line);
  }

  if (patched > 0) {
    fs.writeFileSync(fullPath, out.join('\n'));
    totalPatched += patched;
    filesPatched++;
    console.log(`  ${file}: ${patched} patch${patched === 1 ? '' : 'es'}`);
  }
}

console.log(`\nPatched ${totalPatched} site${totalPatched === 1 ? '' : 's'} across ${filesPatched} file${filesPatched === 1 ? '' : 's'}.`);
