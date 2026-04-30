#!/usr/bin/env node
// One-shot cleanup: remove the auto-generated `class="related-calcs"` block on
// pages that ALSO carry a hand-picked `<!-- related-calculators-block -->`
// block. The auto block uses generic anchor text ("Calorie Calculator"); the
// hand-picked block uses intent-driven copy ("Work out calories and BMR for
// your goal") and is always preferred per ROADMAP "Site SEO programme #5".
//
// The duplication exists because inject-seo-schema.js previously deduped only
// against the auto block's class. That check has been widened, so this script
// is the catch-up pass for pages already shipped with both.
//
// Usage:
//   node scripts/strip-duplicate-related-calcs.js          # dry run
//   node scripts/strip-duplicate-related-calcs.js --write  # apply

const fs = require('node:fs');
const path = require('node:path');

const SITE_ROOT = path.resolve(__dirname, '..', 'site', 'calculators');
const APPLY = process.argv.includes('--write');

const HAND_PICKED_MARKER = '<!-- related-calculators-block -->';

// Match the full auto block including its leading whitespace and trailing newline.
// Shape (from inject-seo-schema.js buildRelatedCalcs):
//   \n        <section class="related-calcs" aria-labelledby="related-heading">
//   ...
//   </section>\n
//
// Negative lookbehind on the marker comment so we never strip a hand-picked
// block that reuses the `related-calcs` styling hooks. Hand-picked blocks are
// always preceded by `<!-- related-calculators-block -->` on the line above.
const AUTO_BLOCK_RE =
  /\n[ \t]*(?<!<!-- related-calculators-block -->\n[ \t]*)<section class="related-calcs"[\s\S]*?<\/section>\n/;

function* walkCalcPages(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkCalcPages(full);
    } else if (entry.isFile() && entry.name === 'index.html') {
      // Only calculator pages: site/calculators/{cat}/{slug}/index.html
      const rel = path.relative(SITE_ROOT, full).split(path.sep);
      if (rel.length === 3) yield full;
    }
  }
}

const stripped = [];
const skipped = [];

for (const file of walkCalcPages(SITE_ROOT)) {
  const html = fs.readFileSync(file, 'utf8');
  const hasAuto = html.includes('class="related-calcs"');
  const hasHand = html.includes(HAND_PICKED_MARKER);
  if (!hasAuto || !hasHand) continue;

  const next = html.replace(AUTO_BLOCK_RE, '\n');
  if (next === html) {
    skipped.push({ file, reason: 'regex did not match auto block' });
    continue;
  }
  // Sanity: the hand-picked marker must still be there.
  if (!next.includes(HAND_PICKED_MARKER)) {
    skipped.push({ file, reason: 'strip would remove the hand-picked block' });
    continue;
  }
  // Sanity: there should now be exactly zero auto blocks remaining.
  if (next.includes('class="related-calcs"')) {
    skipped.push({ file, reason: 'second auto block remained after strip' });
    continue;
  }

  if (APPLY) fs.writeFileSync(file, next, 'utf8');
  stripped.push(file);
}

const rel = (f) => path.relative(path.resolve(__dirname, '..'), f);

console.log(`${APPLY ? 'WROTE' : 'DRY RUN'}: stripped auto block from ${stripped.length} pages`);
for (const f of stripped) console.log(`  - ${rel(f)}`);

// "regex did not match auto block" is now expected and benign: it fires when a
// hand-picked block legitimately reuses the `related-calcs` styling class and
// is correctly excluded by the negative-lookbehind on the marker comment. Only
// the other skip reasons (which would indicate genuine corruption) should fail.
const realProblems = skipped.filter((s) => s.reason !== 'regex did not match auto block');
if (realProblems.length) {
  console.log(`\nSkipped ${realProblems.length} with unexpected shape:`);
  for (const s of realProblems) console.log(`  ! ${rel(s.file)}  (${s.reason})`);
  process.exit(1);
}
