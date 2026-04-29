#!/usr/bin/env node
// Resync FAQPage JSON-LD on every calc page so it matches the visible
// <section class="faq"> details/summary/answer pairs exactly. Required for
// Google rich-snippet compliance: schema must reflect what's on screen.
'use strict';
const fs = require('fs');
const path = require('path');

function walk(d, out = []) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p, out);
    else if (f.name === 'index.html' && p.split('/').length === 5 && p.includes('/calculators/')) out.push(p);
  }
  return out;
}

function stripTags(s) { return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); }
function escAttr(s) { return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim(); }

function extractVisibleFaq(html) {
  const sec = (html.match(/<section class="faq"[\s\S]*?<\/section>/i) || [''])[0];
  if (!sec) return [];
  // Each <details> typically wraps a <summary> question and answer prose
  const items = [];
  const detailsBlocks = [...sec.matchAll(/<details[\s\S]*?<\/details>/gi)];
  for (const d of detailsBlocks) {
    const block = d[0];
    const qm = block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i);
    if (!qm) continue;
    const question = stripTags(qm[1]);
    // Answer: everything inside <details> after </summary>
    const after = block.slice(block.indexOf('</summary>') + '</summary>'.length, block.lastIndexOf('</details>'));
    const answer = stripTags(after);
    if (question && answer) items.push({ question, answer });
  }
  return items;
}

function buildFaqJsonLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(i => ({
      '@type': 'Question',
      name: i.question,
      acceptedAnswer: { '@type': 'Answer', text: i.answer },
    })),
  };
}

function replaceFaqBlock(html, newJson) {
  const blockRe = /<script type="application\/ld\+json">\s*\{[^]*?"@type":\s*"FAQPage"[^]*?\}\s*<\/script>/;
  // The non-greedy regex above can over-match across blocks. Use a parsing approach.
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  let foundIdx = -1;
  for (const b of blocks) {
    try {
      const j = JSON.parse(b[1]);
      if (j['@type'] === 'FAQPage') { foundIdx = b.index; break; }
    } catch (e) {}
  }
  if (foundIdx < 0) return null;
  // Find the exact match starting at foundIdx
  const tail = html.slice(foundIdx);
  const endIdx = foundIdx + tail.indexOf('</script>') + '</script>'.length;
  const newBlock = '<script type="application/ld+json">\n' + JSON.stringify(newJson, null, 2) + '\n  </script>';
  return html.slice(0, foundIdx) + newBlock + html.slice(endIdx);
}

const root = path.resolve(__dirname, '..');
process.chdir(root);
const calcs = walk('site/calculators');
let fixed = 0, ok = 0, skipped = 0;
for (const p of calcs) {
  const html = fs.readFileSync(p, 'utf8');
  const visible = extractVisibleFaq(html);
  if (visible.length === 0) { skipped++; continue; }
  // Existing JSON-LD count
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  let existing = null;
  for (const b of blocks) {
    try {
      const j = JSON.parse(b[1]);
      if (j['@type'] === 'FAQPage') { existing = j; break; }
    } catch (e) {}
  }
  const existingCount = existing ? existing.mainEntity.length : 0;
  if (existingCount === visible.length && existing) {
    // Verify question strings match too
    const visQs = visible.map(v => v.question).sort();
    const jsonQs = existing.mainEntity.map(q => q.name).sort();
    if (JSON.stringify(visQs) === JSON.stringify(jsonQs)) { ok++; continue; }
  }
  // Rebuild
  const newJson = buildFaqJsonLd(visible);
  const newHtml = replaceFaqBlock(html, newJson);
  if (newHtml && newHtml !== html) {
    fs.writeFileSync(p, newHtml);
    fixed++;
    console.log('FIXED', p, 'vis=' + visible.length, 'was=' + existingCount);
  }
}
console.log(`\nTotal calc pages: ${calcs.length}, ok: ${ok}, fixed: ${fixed}, skipped (no visible FAQ): ${skipped}`);
