#!/usr/bin/env node
/**
 * Inject SEO infrastructure across the static site:
 *   1. BreadcrumbList JSON-LD
 *   2. Organization JSON-LD
 *   3. Person JSON-LD
 *   4. Related calculators section (calc pages only)
 *
 * Idempotent: marker comments prevent double-injection.
 *
 * Usage: node scripts/inject-seo-schema.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE_DIR = path.join(ROOT, 'site');
const CATEGORIES = JSON.parse(fs.readFileSync(path.join(ROOT, 'categories.json'), 'utf8'));
const SITE_BASE = 'https://webcaretakers.com';

// Hand-picked cross-category relations for the 4th related slot. If a calc has
// no entry, we stop at three same-category siblings.
const CROSS_CATEGORY = {
  'finance/uk-mortgage-calculator': '/calculators/property/uk-leasehold-ground-rent-service-charge-calculator/',
  'finance/mortgage-calculator': '/calculators/property/uk-rent-vs-buy-calculator/',
  'finance/uk-stamp-duty-calculator': '/calculators/property/uk-house-move-cost-calculator/',
  'finance/uk-salary-tax-calculator': '/calculators/business/freelance-day-rate-calculator/',
  'business/seo-roi-calculator': '/calculators/seo/keyword-density-calculator/',
  'business/website-speed-budget-calculator': '/calculators/seo/meta-length-checker/',
  'ai/llm-token-usage-calculator': '/calculators/business/seo-roi-calculator/',
  'broadband/broadband-bandwidth-calculator': '/calculators/business/website-speed-budget-calculator/',
  'cybersecurity/data-breach-cost-estimator': '/calculators/business/it-support-build-vs-buy-calculator/',
};

// Build a slug => {category, name, tools[]} index.
const TOOL_INDEX = new Map(); // key: `${cat}/${slug}` => {name, categorySlug, categoryName, siblings}
const CATEGORY_BY_SLUG = new Map();
for (const cat of CATEGORIES.categories) {
  CATEGORY_BY_SLUG.set(cat.slug, cat);
  for (const tool of cat.tools) {
    TOOL_INDEX.set(`${cat.slug}/${tool.slug}`, {
      name: tool.name,
      categorySlug: cat.slug,
      categoryName: cat.name,
    });
  }
}

function walkIndexHtml(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walkIndexHtml(p, out);
    else if (entry.isFile() && entry.name === 'index.html') out.push(p);
  }
  return out;
}

function classifyPage(filePath) {
  const rel = path.relative(SITE_DIR, filePath).replace(/\\/g, '/');
  // rel looks like: 'index.html', 'about/index.html', 'calculators/index.html',
  // 'calculators/finance/index.html', 'calculators/finance/uk-mortgage-calculator/index.html'.
  const parts = rel.split('/').slice(0, -1); // drop 'index.html'
  if (parts.length === 0) return { type: 'home', urlPath: '/' };
  if (parts.length === 1 && parts[0] === 'calculators') return { type: 'all-calcs', urlPath: '/calculators/' };
  if (parts.length === 1) return { type: 'utility', utility: parts[0], urlPath: `/${parts[0]}/` };
  if (parts.length === 2 && parts[0] === 'calculators') {
    return { type: 'category', categorySlug: parts[1], urlPath: `/${parts[0]}/${parts[1]}/` };
  }
  if (parts.length === 3 && parts[0] === 'calculators') {
    return { type: 'calc', categorySlug: parts[1], calcSlug: parts[2], urlPath: `/${parts[0]}/${parts[1]}/${parts[2]}/` };
  }
  return { type: 'unknown', urlPath: '/' + parts.join('/') + '/' };
}

function utilityName(slug) {
  // visible breadcrumb labels we observed:
  // /about/ -> "About"
  // /privacy/ -> "Privacy policy"
  // /terms/ -> "Terms of use"
  // /contact/ -> "Contact"
  return {
    about: 'About',
    privacy: 'Privacy policy',
    terms: 'Terms of use',
    contact: 'Contact',
  }[slug] || slug.charAt(0).toUpperCase() + slug.slice(1);
}

function buildBreadcrumb(meta, html) {
  const items = [];
  const push = (name, url) => items.push({
    '@type': 'ListItem',
    position: items.length + 1,
    name,
    item: SITE_BASE + url,
  });
  push('Home', '/');
  if (meta.type === 'home') {
    // just Home
  } else if (meta.type === 'all-calcs') {
    items[0].name = 'Home';
    push('All calculators', '/calculators/');
  } else if (meta.type === 'utility') {
    push(utilityName(meta.utility), meta.urlPath);
  } else if (meta.type === 'category') {
    const cat = CATEGORY_BY_SLUG.get(meta.categorySlug);
    push('Calculators', '/calculators/');
    push(cat ? cat.name : meta.categorySlug, meta.urlPath);
  } else if (meta.type === 'calc') {
    const cat = CATEGORY_BY_SLUG.get(meta.categorySlug);
    const tool = TOOL_INDEX.get(`${meta.categorySlug}/${meta.calcSlug}`);
    push('Calculators', '/calculators/');
    push(cat ? cat.name : meta.categorySlug, `/calculators/${meta.categorySlug}/`);
    // Prefer the visible breadcrumb's last <li> label so JSON-LD matches what users see.
    const bcLast = extractBreadcrumbLastLabel(html);
    push(bcLast || (tool ? tool.name : meta.calcSlug), meta.urlPath);
  }
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  };
}

function extractBreadcrumbLastLabel(html) {
  const m = html.match(/<nav[^>]*aria-label="Breadcrumb"[\s\S]*?<\/nav>/i);
  if (!m) return null;
  const block = m[0];
  const last = block.match(/<li[^>]*aria-current="page"[^>]*>([\s\S]*?)<\/li>/i);
  if (!last) return null;
  return last[1].replace(/<[^>]+>/g, '').trim();
}

const ORG_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'WebCaretakers',
  url: 'https://webcaretakers.com/',
  founder: { '@type': 'Person', name: 'Andrew Laws' },
  sameAs: [
    'https://andrewlaws.com/',
    'https://yeseo.io/',
    'https://lawsie.com/',
    'https://www.linkedin.com/in/andrewlaws/',
  ],
};

const PERSON_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Andrew Laws',
  jobTitle: 'SEO consultant and founder, Yeseo',
  url: 'https://andrewlaws.com/',
  sameAs: [
    'https://www.linkedin.com/in/andrewlaws/',
    'https://yeseo.io/',
    'https://lawsie.com/',
    'https://andrewlaws.com/',
  ],
  knowsAbout: ['SEO', 'search engine optimisation', 'website performance', 'calculator tools'],
};

function jsonLdBlock(marker, obj) {
  return `  <!-- ${marker} -->\n  <script type="application/ld+json">\n${JSON.stringify(obj, null, 2)}\n  </script>\n`;
}

function injectIntoHead(html, blocks) {
  // Insert immediately before </head>.
  return html.replace(/<\/head>/i, blocks + '</head>');
}

function buildRelatedCalcs(meta) {
  if (meta.type !== 'calc') return null;
  const cat = CATEGORY_BY_SLUG.get(meta.categorySlug);
  if (!cat) return null;
  const tools = cat.tools;
  const idx = tools.findIndex((t) => t.slug === meta.calcSlug);
  if (idx === -1) return null;
  const siblings = [];
  for (let step = 1; step <= tools.length && siblings.length < 3; step++) {
    const next = tools[(idx + step) % tools.length];
    if (next.slug === meta.calcSlug) continue;
    siblings.push(next);
  }
  const items = siblings.map((s) => `      <li><a href="/calculators/${cat.slug}/${s.slug}/">${escapeHtml(s.name)}</a></li>`);
  const crossKey = `${meta.categorySlug}/${meta.calcSlug}`;
  const crossUrl = CROSS_CATEGORY[crossKey];
  if (crossUrl) {
    const crossName = lookupNameByUrl(crossUrl);
    if (crossName) items.push(`      <li><a href="${crossUrl}">${escapeHtml(crossName)}</a></li>`);
  }
  return `\n        <section class="related-calcs" aria-labelledby="related-heading">\n          <h2 id="related-heading">Related calculators</h2>\n          <ul class="related-calcs__list">\n${items.join('\n')}\n          </ul>\n        </section>\n`;
}

function lookupNameByUrl(url) {
  // url like /calculators/property/uk-rent-vs-buy-calculator/
  const m = url.match(/^\/calculators\/([^/]+)\/([^/]+)\/$/);
  if (!m) return null;
  const t = TOOL_INDEX.get(`${m[1]}/${m[2]}`);
  return t ? t.name : null;
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function injectRelatedSection(html, sectionHtml) {
  // Insert just before the closing </main> tag, inside the container div.
  // Use the last </main> in the file to be safe.
  const idx = html.lastIndexOf('</main>');
  if (idx === -1) return html;
  // Walk backward to find the preceding `</div>` (closes the container) so we
  // place the section inside the .container that follows the main heading,
  // matching how the rest of the calc body is wrapped.
  // Simpler approach: find the last `      </div>\n    </main>` (six-space indent)
  // and inject before that closing div.
  const closeContainerPattern = /(\s*)<\/div>\s*<\/main>/;
  const m = html.match(closeContainerPattern);
  if (m) {
    return html.replace(closeContainerPattern, `${sectionHtml}${m[0]}`);
  }
  return html.slice(0, idx) + sectionHtml + html.slice(idx);
}

function processFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');
  let html = original;
  const meta = classifyPage(filePath);
  const additions = [];

  if (!html.includes('<!-- breadcrumb-jsonld -->')) {
    additions.push(jsonLdBlock('breadcrumb-jsonld', buildBreadcrumb(meta, html)));
  }
  if (!html.includes('<!-- org-jsonld -->')) {
    additions.push(jsonLdBlock('org-jsonld', ORG_SCHEMA));
  }
  if (!html.includes('<!-- person-jsonld -->')) {
    additions.push(jsonLdBlock('person-jsonld', PERSON_SCHEMA));
  }
  if (additions.length) {
    html = injectIntoHead(html, additions.join(''));
  }

  let relatedAdded = false;
  // Skip auto-injection if the page already carries a Related Calculators block,
  // whether the auto-generated one (class="related-calcs") or a hand-picked one
  // (marker comment <!-- related-calculators-block -->). The hand-picked block is
  // always preferred because it uses intent-driven anchor text.
  const hasAutoBlock = html.includes('class="related-calcs"');
  const hasHandPickedBlock = html.includes('<!-- related-calculators-block -->');
  if (meta.type === 'calc' && !hasAutoBlock && !hasHandPickedBlock) {
    const sectionHtml = buildRelatedCalcs(meta);
    if (sectionHtml) {
      html = injectRelatedSection(html, sectionHtml);
      relatedAdded = true;
    }
  }

  if (html !== original) {
    fs.writeFileSync(filePath, html, 'utf8');
    return { changed: true, additions: additions.length, relatedAdded, meta };
  }
  return { changed: false, additions: 0, relatedAdded: false, meta };
}

function main() {
  const files = walkIndexHtml(SITE_DIR);
  let changed = 0;
  let breadcrumbCount = 0;
  let relatedCount = 0;
  for (const f of files) {
    const result = processFile(f);
    if (result.changed) changed++;
    if (result.additions > 0) breadcrumbCount++;
    if (result.relatedAdded) relatedCount++;
    const rel = path.relative(ROOT, f);
    if (result.changed) {
      console.log(`MODIFIED ${rel} (head adds=${result.additions}, related=${result.relatedAdded})`);
    } else {
      console.log(`SKIP     ${rel}`);
    }
  }
  console.log(`\nTotal files: ${files.length}, modified: ${changed}, head-injected: ${breadcrumbCount}, related-calcs added: ${relatedCount}`);
}

if (require.main === module) main();
