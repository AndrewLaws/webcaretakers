#!/usr/bin/env node
/**
 * Inject three sitewide additions, idempotently:
 *   1. Twitter Card meta tags (all pages with og: tags)
 *   2. Visible "Last updated" author byline (calc pages only)
 *   3. dateModified + author fields in SoftwareApplication JSON-LD (calc pages)
 *
 * Markers used to keep this safe to re-run:
 *   <!-- twitter-card -->
 *   <!-- author-byline -->
 *   "dateModified" key in the SoftwareApplication JSON-LD block
 *
 * Usage: node scripts/inject-author-meta.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE_DIR = path.join(ROOT, 'site');

const TODAY_ISO = '2026-04-29';
const TODAY_HUMAN = '29 April 2026';

const AUTHOR_OBJ = {
  '@type': 'Person',
  name: 'Andrew Laws',
  url: 'https://andrewlaws.com/',
};

function walkIndexHtml(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walkIndexHtml(p, out);
    else if (entry.isFile() && entry.name === 'index.html') out.push(p);
  }
  return out;
}

function isCalcPage(filePath) {
  // /site/calculators/{cat}/{slug}/index.html
  const rel = path.relative(SITE_DIR, filePath).replace(/\\/g, '/');
  const parts = rel.split('/');
  return parts.length === 4 && parts[0] === 'calculators' && parts[3] === 'index.html';
}

function decodeHtmlEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function escapeAttr(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function extractMetaContent(html, attrName, attrValue) {
  // Match <meta {attrName}="{attrValue}" content="...">
  const re = new RegExp(
    `<meta\\s+${attrName}="${attrValue.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}"\\s+content="([^"]*)"\\s*/?>`,
    'i'
  );
  const m = html.match(re);
  return m ? m[1] : null;
}

function injectTwitterCard(html) {
  if (html.includes('<!-- twitter-card -->')) return html;
  const ogTitle = extractMetaContent(html, 'property', 'og:title');
  const ogDesc = extractMetaContent(html, 'property', 'og:description');
  const ogImage = extractMetaContent(html, 'property', 'og:image');
  if (!ogTitle && !ogDesc) return html; // no og: tags, skip

  const lines = ['  <!-- twitter-card -->'];
  lines.push('  <meta name="twitter:card" content="summary_large_image">');
  if (ogTitle) lines.push(`  <meta name="twitter:title" content="${ogTitle}">`);
  if (ogDesc) lines.push(`  <meta name="twitter:description" content="${ogDesc}">`);
  if (ogImage) lines.push(`  <meta name="twitter:image" content="${ogImage}">`);
  const block = lines.join('\n') + '\n';

  // Insert immediately after the last og: meta tag.
  const ogRe = /<meta\s+property="og:[^"]+"\s+content="[^"]*"\s*\/?>(\s*\n)?/gi;
  let lastMatch;
  let m;
  while ((m = ogRe.exec(html)) !== null) {
    lastMatch = m;
  }
  if (!lastMatch) return html;
  const insertAt = lastMatch.index + lastMatch[0].length;
  return html.slice(0, insertAt) + block + html.slice(insertAt);
}

function injectAuthorByline(html) {
  if (html.includes('<!-- author-byline -->')) return html;
  const byline = `        <!-- author-byline -->\n        <p class="author-byline">Last updated ${TODAY_HUMAN} by <a href="/about/">Andrew Laws</a>.</p>\n`;

  // Prefer placement immediately before the related-calcs section.
  const relatedIdx = html.indexOf('<section class="related-calcs"');
  if (relatedIdx !== -1) {
    // Find the start of the line (preserve indentation from the section).
    // Insert byline just before the section, on its own line.
    const before = html.slice(0, relatedIdx);
    const lineStart = before.lastIndexOf('\n') + 1;
    const indent = before.slice(lineStart); // whitespace only on this line
    const newByline = `${indent}<!-- author-byline -->\n${indent}<p class="author-byline">Last updated ${TODAY_HUMAN} by <a href="/about/">Andrew Laws</a>.</p>\n${indent}`;
    return html.slice(0, lineStart) + newByline + html.slice(relatedIdx);
  }

  // Fallback: insert before closing </main>.
  const idx = html.lastIndexOf('</main>');
  if (idx === -1) return html;
  return html.slice(0, idx) + byline + html.slice(idx);
}

function injectSoftwareAppFields(html) {
  // Find each <script type="application/ld+json"> block and check if it's SoftwareApplication.
  const re = /<script\s+type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/gi;
  let result = '';
  let lastIndex = 0;
  let m;
  let modified = false;
  while ((m = re.exec(html)) !== null) {
    const fullMatch = m[0];
    const body = m[1];
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch (e) {
      // skip non-parseable (unlikely)
      result += html.slice(lastIndex, m.index + fullMatch.length);
      lastIndex = m.index + fullMatch.length;
      continue;
    }

    const isSoftwareApp =
      parsed && parsed['@type'] === 'SoftwareApplication';

    if (!isSoftwareApp) {
      result += html.slice(lastIndex, m.index + fullMatch.length);
      lastIndex = m.index + fullMatch.length;
      continue;
    }

    let changed = false;
    if (!parsed.dateModified) {
      parsed.dateModified = TODAY_ISO;
      changed = true;
    }
    if (!parsed.author) {
      parsed.author = AUTHOR_OBJ;
      changed = true;
    }

    if (!changed) {
      result += html.slice(lastIndex, m.index + fullMatch.length);
      lastIndex = m.index + fullMatch.length;
      continue;
    }

    // Re-stringify, attempting to preserve existing 2-space indentation style.
    const rebuilt = JSON.stringify(parsed, null, 2);
    // Match the existing leading whitespace of the script tag for nicer indent.
    const newBlock = `<script type="application/ld+json">\n${rebuilt}\n  </script>`;
    result += html.slice(lastIndex, m.index) + newBlock;
    lastIndex = m.index + fullMatch.length;
    modified = true;
  }
  result += html.slice(lastIndex);
  return modified ? result : html;
}

function processFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');
  let html = original;
  const calc = isCalcPage(filePath);

  const beforeTwitter = html;
  html = injectTwitterCard(html);
  const twitterAdded = html !== beforeTwitter;

  let bylineAdded = false;
  let schemaUpdated = false;
  if (calc) {
    const beforeByline = html;
    html = injectAuthorByline(html);
    bylineAdded = html !== beforeByline;

    const beforeSchema = html;
    html = injectSoftwareAppFields(html);
    schemaUpdated = html !== beforeSchema;
  }

  if (html !== original) {
    fs.writeFileSync(filePath, html, 'utf8');
    return { changed: true, twitterAdded, bylineAdded, schemaUpdated };
  }
  return { changed: false, twitterAdded: false, bylineAdded: false, schemaUpdated: false };
}

function main() {
  const files = walkIndexHtml(SITE_DIR);
  let changed = 0;
  let tw = 0;
  let by = 0;
  let sc = 0;
  for (const f of files) {
    const r = processFile(f);
    if (r.changed) {
      changed++;
      if (r.twitterAdded) tw++;
      if (r.bylineAdded) by++;
      if (r.schemaUpdated) sc++;
      const rel = path.relative(ROOT, f);
      console.log(
        `MODIFIED ${rel} (twitter=${r.twitterAdded}, byline=${r.bylineAdded}, schema=${r.schemaUpdated})`
      );
    }
  }
  console.log(
    `\nTotal files: ${files.length}, modified: ${changed}, twitter-card: ${tw}, byline: ${by}, schema-updated: ${sc}`
  );
}

if (require.main === module) main();
