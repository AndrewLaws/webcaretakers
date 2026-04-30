#!/usr/bin/env node
// Validates JSON-LD on every published page so schema breakage fails the build
// rather than getting silently shipped and flagged by Google weeks later.
//
// Rules (matching the audit baseline documented in ROADMAP.md "Site SEO programme"):
//   homepage      -> WebSite, Organization
//   category-hub  -> CollectionPage, ItemList, BreadcrumbList
//   calculator    -> SoftwareApplication, FAQPage, BreadcrumbList
//                    (FAQPage.mainEntity must be non-empty so we never ship fabricated FAQs)
//   other         -> JSON-LD must parse, but no required-shape rules
//
// Run via `npm run validate:schema` or as part of `npm test`.

const fs = require('node:fs');
const path = require('node:path');

const SITE_ROOT = path.resolve(__dirname, '..', 'site');

const REQUIRED = {
  homepage: ['WebSite', 'Organization'],
  'category-hub': ['CollectionPage', 'ItemList', 'BreadcrumbList'],
  calculator: ['SoftwareApplication', 'FAQPage', 'BreadcrumbList'],
  other: [],
};

function extractJsonLdBlocks(html) {
  const blocks = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    const raw = match[1].trim();
    if (!raw) continue;
    try {
      blocks.push(JSON.parse(raw));
    } catch (err) {
      throw new Error(`Invalid JSON-LD block: ${err.message}\nContent: ${raw.slice(0, 200)}`);
    }
  }
  return blocks;
}

// Returns 'homepage' | 'category-hub' | 'calculator' | 'other' for a given index.html path.
function classifyPage(filePath, siteRoot = SITE_ROOT) {
  const rel = path.relative(siteRoot, filePath).split(path.sep);
  if (rel.length === 1 && rel[0] === 'index.html') return 'homepage';
  if (rel[0] !== 'calculators') return 'other';
  // calculators/index.html — the all-calculators A-Z, treated as 'other' (no specific schema contract yet)
  if (rel.length === 2 && rel[1] === 'index.html') return 'other';
  // calculators/{category}/index.html
  if (rel.length === 3 && rel[2] === 'index.html') return 'category-hub';
  // calculators/{category}/{slug}/index.html
  if (rel.length === 4 && rel[3] === 'index.html') return 'calculator';
  return 'other';
}

function flatten(blocks) {
  // Walk @graph, arrays, and nested object properties so a node like
  // CollectionPage.mainEntity = { @type: ItemList } still counts as ItemList present.
  const out = [];
  function walk(node) {
    if (!node) return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (typeof node !== 'object') return;
    if (Array.isArray(node['@graph'])) {
      node['@graph'].forEach(walk);
    }
    if (node['@type']) out.push(node);
    for (const [key, value] of Object.entries(node)) {
      if (key === '@graph' || key === '@type' || key === '@context') continue;
      if (value && typeof value === 'object') walk(value);
    }
  }
  blocks.forEach(walk);
  return out;
}

function typesPresent(blocks) {
  return new Set(flatten(blocks).map((b) => b && b['@type']).filter(Boolean));
}

function findFirst(blocks, type) {
  return flatten(blocks).find((b) => b && b['@type'] === type);
}

function validatePage(pageType, blocks) {
  const errors = [];
  const required = REQUIRED[pageType] || [];
  const present = typesPresent(blocks);

  for (const t of required) {
    if (!present.has(t)) {
      errors.push(`missing ${t}`);
    }
  }

  // Shape checks beyond mere presence.
  if (pageType === 'calculator') {
    const faq = findFirst(blocks, 'FAQPage');
    if (faq) {
      const me = faq.mainEntity;
      if (!Array.isArray(me) || me.length === 0) {
        errors.push('FAQPage has empty mainEntity (do not ship pages with fabricated or missing FAQs)');
      }
    }
    const bc = findFirst(blocks, 'BreadcrumbList');
    if (bc && (!Array.isArray(bc.itemListElement) || bc.itemListElement.length === 0)) {
      errors.push('BreadcrumbList has no itemListElement');
    }
  }

  if (pageType === 'category-hub') {
    const il = findFirst(blocks, 'ItemList');
    if (il && (!Array.isArray(il.itemListElement) || il.itemListElement.length === 0)) {
      errors.push('ItemList has no itemListElement');
    }
  }

  return errors;
}

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile() && entry.name === 'index.html') {
      yield full;
    }
  }
}

function main() {
  const failures = [];
  let total = 0;
  for (const file of walk(SITE_ROOT)) {
    total++;
    const html = fs.readFileSync(file, 'utf8');
    let blocks;
    try {
      blocks = extractJsonLdBlocks(html);
    } catch (err) {
      failures.push({ file, errors: [err.message] });
      continue;
    }
    const pageType = classifyPage(file);
    const errors = validatePage(pageType, blocks);
    if (errors.length) failures.push({ file, pageType, errors });
  }

  if (failures.length === 0) {
    console.log(`OK  ${total} pages validated, no JSON-LD issues.`);
    return 0;
  }

  console.error(`FAIL  ${failures.length} of ${total} pages have JSON-LD issues:\n`);
  for (const f of failures) {
    const rel = path.relative(path.resolve(__dirname, '..'), f.file);
    console.error(`  ${rel}  [${f.pageType || 'unknown'}]`);
    for (const e of f.errors) console.error(`    - ${e}`);
  }
  return 1;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = { extractJsonLdBlocks, classifyPage, validatePage };
