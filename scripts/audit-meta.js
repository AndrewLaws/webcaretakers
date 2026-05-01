#!/usr/bin/env node
// Title and meta audit.
//
// Walks every published page and produces:
//   1. a CSV at audit-meta.csv with one row per page (for human review)
//   2. a stdout report of rule violations and duplicate titles/descriptions
//
// Length thresholds match what Google actually displays:
//   - <title> 30 to 60 chars (truncates around 60 in SERPs)
//   - meta description 70 to 160 chars (truncates around 160)
//
// Country-targeted calculators (slug starts with `uk-` or `us-`) are checked
// against the hreflang requirements documented in CLAUDE.md.
//
// This is a read-only audit: the script never writes to HTML. Once GSC data
// flows (Site SEO programme task #1), the CSV plus query-per-page data become
// the input for the rewrite pass (task #4).
//
// Exit code is 1 if any HARD error is found (missing title, missing
// description, missing canonical, multiple h1s, noindex), 0 otherwise.
// Length warnings and hreflang gaps do not fail the build but are reported.

const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SITE_ROOT = path.join(REPO_ROOT, 'site');
const CSV_OUT = path.join(REPO_ROOT, 'audit-meta.csv');

const TITLE_MIN = 30;
const TITLE_MAX = 60;
const DESC_MIN = 70;
const DESC_MAX = 160;

// ----- Pure functions (unit-tested) -----

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function matchAttr(html, tagRe) {
  const m = html.match(tagRe);
  return m ? decodeEntities(m[1].trim()) : '';
}

function extractMeta(html) {
  const title = matchAttr(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = matchAttr(
    html,
    /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i
  );
  const canonical = matchAttr(
    html,
    /<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i
  );
  const robots = matchAttr(
    html,
    /<meta\s+name=["']robots["']\s+content=["']([^"']*)["']/i
  );
  const ogTitle = matchAttr(
    html,
    /<meta\s+property=["']og:title["']\s+content=["']([^"']*)["']/i
  );
  const ogDescription = matchAttr(
    html,
    /<meta\s+property=["']og:description["']\s+content=["']([^"']*)["']/i
  );
  const ogUrl = matchAttr(
    html,
    /<meta\s+property=["']og:url["']\s+content=["']([^"']*)["']/i
  );
  const twitterCard = matchAttr(
    html,
    /<meta\s+name=["']twitter:card["']\s+content=["']([^"']*)["']/i
  );
  const htmlLang = matchAttr(html, /<html[^>]*\slang=["']([^"']+)["']/i);

  // h1 count and first-h1 text
  const h1Re = /<h1[^>]*>([\s\S]*?)<\/h1>/gi;
  const h1s = [];
  let m;
  while ((m = h1Re.exec(html)) !== null) {
    h1s.push(decodeEntities(m[1].replace(/<[^>]+>/g, '').trim()));
  }

  // hreflang collection
  const hreflangs = [];
  const hrefRe = /<link\s+rel=["']alternate["']\s+hreflang=["']([^"']+)["']\s+href=["']([^"']+)["']/gi;
  while ((m = hrefRe.exec(html)) !== null) {
    hreflangs.push({ lang: m[1], href: m[2] });
  }

  return {
    title,
    description,
    canonical,
    robots,
    ogTitle,
    ogDescription,
    ogUrl,
    twitterCard,
    htmlLang,
    h1: h1s[0] || '',
    h1Count: h1s.length,
    hreflangs,
  };
}

function classifyCountryTarget(urlPath) {
  // urlPath like /calculators/finance/uk-mortgage-calculator/
  const m = urlPath.match(/\/calculators\/[^/]+\/(uk|us)-[^/]+\//);
  return m ? m[1] : null;
}

function validateMeta(meta, urlPath) {
  const errors = [];

  // Hard errors (will fail the run)
  if (!meta.title) errors.push('HARD: title missing');
  if (!meta.description) errors.push('HARD: description missing');
  if (!meta.canonical) errors.push('HARD: canonical missing');
  if (meta.h1Count === 0) errors.push('HARD: h1 missing');
  if (meta.h1Count > 1) errors.push(`HARD: multiple h1s (${meta.h1Count})`);
  if (/noindex/i.test(meta.robots || '')) errors.push('HARD: noindex robots set');

  // Soft warnings (informational, will not fail the run)
  if (meta.title && meta.title.length > TITLE_MAX) {
    errors.push(`WARN: title too long (${meta.title.length} chars, max ${TITLE_MAX})`);
  }
  if (meta.title && meta.title.length > 0 && meta.title.length < TITLE_MIN) {
    errors.push(`WARN: title too short (${meta.title.length} chars, min ${TITLE_MIN})`);
  }
  if (meta.description && meta.description.length > DESC_MAX) {
    errors.push(`WARN: description too long (${meta.description.length} chars, max ${DESC_MAX})`);
  }
  if (meta.description && meta.description.length > 0 && meta.description.length < DESC_MIN) {
    errors.push(`WARN: description too short (${meta.description.length} chars, min ${DESC_MIN})`);
  }
  if (!meta.ogTitle) errors.push('WARN: og:title missing');
  if (!meta.ogDescription) errors.push('WARN: og:description missing');
  if (!meta.twitterCard) errors.push('WARN: twitter:card missing');

  // Country-targeted pages need the hreflang stack per CLAUDE.md
  const country = classifyCountryTarget(urlPath);
  if (country) {
    const langs = new Set(meta.hreflangs.map((h) => h.lang.toLowerCase()));
    const need = country === 'uk' ? 'en-gb' : 'en-us';
    if (!langs.has(need)) {
      errors.push(`WARN: hreflang ${need} missing on country-targeted page`);
    }
    if (!langs.has('x-default')) {
      errors.push('WARN: hreflang x-default missing on country-targeted page');
    }
  }

  return errors;
}

function detectDuplicates(rows, field) {
  const groups = new Map();
  for (const r of rows) {
    const v = r[field];
    if (!v) continue;
    if (!groups.has(v)) groups.set(v, []);
    groups.get(v).push(r.url);
  }
  return [...groups.entries()]
    .filter(([, urls]) => urls.length > 1)
    .map(([value, urls]) => ({ value, urls }));
}

// ----- Side-effect helpers -----

function* walkPages(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkPages(full);
    } else if (entry.isFile() && entry.name === 'index.html') {
      yield full;
    }
  }
}

function urlPathFromFile(file, siteRoot = SITE_ROOT) {
  const rel = path.relative(siteRoot, file).split(path.sep);
  rel.pop(); // drop index.html
  if (rel.length === 0) return '/';
  return '/' + rel.join('/') + '/';
}

function csvEscape(s) {
  if (s == null) return '';
  const v = String(s);
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function writeCsv(rows) {
  const headers = [
    'url', 'titleLen', 'title', 'descLen', 'description', 'canonical', 'h1', 'h1Count',
    'robots', 'htmlLang', 'hreflangCount', 'ogTitle', 'twitterCard', 'errorCount',
  ];
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push([
      csvEscape(r.url),
      r.titleLen,
      csvEscape(r.title),
      r.descLen,
      csvEscape(r.description),
      csvEscape(r.canonical),
      csvEscape(r.h1),
      r.h1Count,
      csvEscape(r.robots),
      csvEscape(r.htmlLang),
      r.hreflangCount,
      csvEscape(r.ogTitle),
      csvEscape(r.twitterCard),
      r.errors.length,
    ].join(','));
  }
  fs.writeFileSync(CSV_OUT, lines.join('\n') + '\n', 'utf8');
}

// ----- Main -----

function main() {
  const rows = [];
  let hardErrors = 0;
  let softWarnings = 0;
  const violationsByPage = [];

  for (const file of walkPages(SITE_ROOT)) {
    const html = fs.readFileSync(file, 'utf8');
    const meta = extractMeta(html);
    const url = urlPathFromFile(file);
    const errors = validateMeta(meta, url);

    const row = {
      url,
      title: meta.title,
      titleLen: meta.title.length,
      description: meta.description,
      descLen: meta.description.length,
      canonical: meta.canonical,
      h1: meta.h1,
      h1Count: meta.h1Count,
      robots: meta.robots,
      htmlLang: meta.htmlLang,
      hreflangCount: meta.hreflangs.length,
      ogTitle: meta.ogTitle,
      twitterCard: meta.twitterCard,
      errors,
    };
    rows.push(row);

    if (errors.length) {
      violationsByPage.push({ url, errors });
      for (const e of errors) {
        if (e.startsWith('HARD:')) hardErrors++;
        else softWarnings++;
      }
    }
  }

  const titleDupes = detectDuplicates(rows, 'title');
  const descDupes = detectDuplicates(rows, 'description');
  const canonicalDupes = detectDuplicates(rows, 'canonical');

  writeCsv(rows);

  // ----- Report -----
  console.log(`Audited ${rows.length} pages, wrote ${path.relative(REPO_ROOT, CSV_OUT)}\n`);
  console.log(`Hard errors:  ${hardErrors}`);
  console.log(`Soft warns:   ${softWarnings}`);
  console.log(`Duplicate titles:        ${titleDupes.length} groups`);
  console.log(`Duplicate descriptions:  ${descDupes.length} groups`);
  console.log(`Duplicate canonicals:    ${canonicalDupes.length} groups\n`);

  if (titleDupes.length) {
    console.log('Duplicate titles:');
    for (const g of titleDupes) {
      console.log(`  "${g.value}"`);
      for (const u of g.urls) console.log(`    - ${u}`);
    }
    console.log('');
  }
  if (descDupes.length) {
    console.log('Duplicate descriptions:');
    for (const g of descDupes) {
      console.log(`  "${g.value.slice(0, 80)}..."`);
      for (const u of g.urls) console.log(`    - ${u}`);
    }
    console.log('');
  }
  if (canonicalDupes.length) {
    console.log('Duplicate canonicals (likely a real bug):');
    for (const g of canonicalDupes) {
      console.log(`  ${g.value}`);
      for (const u of g.urls) console.log(`    - ${u}`);
    }
    console.log('');
  }

  if (violationsByPage.length) {
    console.log(`Pages with violations (${violationsByPage.length}):`);
    for (const v of violationsByPage) {
      console.log(`  ${v.url}`);
      for (const e of v.errors) console.log(`    ${e}`);
    }
  }

  // Hard errors and duplicate canonicals fail the run
  const exitCode = hardErrors > 0 || canonicalDupes.length > 0 ? 1 : 0;
  process.exit(exitCode);
}

if (require.main === module) {
  main();
}

module.exports = {
  extractMeta,
  classifyCountryTarget,
  validateMeta,
  detectDuplicates,
};
