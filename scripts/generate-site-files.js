const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const SITE_DIR = path.join(__dirname, '..', 'site');
const BASE_URL = 'https://webcaretakers.com';
const SITE_NAME = 'WebCaretakers';
const SITE_DESCRIPTION =
  'Free online calculators for web, marketing, AI, SEO, and small business tech.';

function scanPages(siteDir) {
  const pages = [];
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name === 'index.html') {
        const relDir = path.relative(siteDir, dir);
        const urlPath =
          relDir === ''
            ? '/'
            : '/' + relDir.split(path.sep).join('/') + '/';
        const html = fs.readFileSync(full, 'utf8');
        const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
        const descMatch = html.match(
          /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i,
        );
        pages.push({
          path: full,
          url: urlPath,
          title: titleMatch ? titleMatch[1].trim() : '',
          description: descMatch ? descMatch[1].trim() : '',
        });
      }
    }
  }
  walk(siteDir);
  pages.sort((a, b) => a.url.localeCompare(b.url));
  return pages;
}

function getLastmod(filePath) {
  try {
    const out = execSync(`git log -1 --format=%cI -- "${filePath}"`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (out) return out.split('T')[0];
  } catch (_) {}
  return new Date().toISOString().split('T')[0];
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildSitemap(pages, baseUrl, getLastmodFn = getLastmod) {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ];
  for (const p of pages) {
    lines.push('  <url>');
    lines.push(`    <loc>${escapeXml(baseUrl + p.url)}</loc>`);
    lines.push(`    <lastmod>${getLastmodFn(p.path)}</lastmod>`);
    lines.push('  </url>');
  }
  lines.push('</urlset>');
  return lines.join('\n') + '\n';
}

function buildSitemapIndex(sitemapFilenames, baseUrl, lastmod) {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ];
  for (const filename of sitemapFilenames) {
    lines.push('  <sitemap>');
    lines.push(`    <loc>${escapeXml(baseUrl + '/' + filename)}</loc>`);
    lines.push(`    <lastmod>${lastmod}</lastmod>`);
    lines.push('  </sitemap>');
  }
  lines.push('</sitemapindex>');
  return lines.join('\n') + '\n';
}

// Group pages into buckets keyed by sitemap filename. URLs under
// /calculators/{slug}/ go into sitemap-{slug}.xml; everything else
// (homepage, /about/, /contact/, /privacy/, /terms/, /calculators/) goes
// into sitemap-pages.xml. Future calc additions slot in automatically as
// long as they live under /calculators/{slug}/.
function partitionPagesForSitemaps(pages) {
  const buckets = new Map();
  const pagesKey = 'sitemap-pages.xml';
  for (const p of pages) {
    const m = p.url.match(/^\/calculators\/([^/]+)\//);
    const key = m ? `sitemap-${m[1]}.xml` : pagesKey;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(p);
  }
  // Sort keys so output is deterministic: pages first, then category sitemaps
  // alphabetically.
  const ordered = new Map();
  if (buckets.has(pagesKey)) ordered.set(pagesKey, buckets.get(pagesKey));
  const catKeys = [...buckets.keys()].filter((k) => k !== pagesKey).sort();
  for (const k of catKeys) ordered.set(k, buckets.get(k));
  return ordered;
}

function buildRobots(baseUrl) {
  return [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${baseUrl}/sitemap.xml`,
    '',
  ].join('\n');
}

// Build a lightweight client-side search index from categories.json.
// Each category and each tool becomes one searchable entry.
function buildSearchIndex(categoriesJsonPath) {
  const raw = fs.readFileSync(categoriesJsonPath, 'utf8');
  const data = JSON.parse(raw);
  const entries = [];
  for (const cat of data.categories || []) {
    if (!cat.tools || cat.tools.length === 0) continue;
    // Category hub entry
    entries.push({
      type: 'category',
      name: cat.name + ' calculators',
      summary: cat.tagline || '',
      url: '/calculators/' + cat.slug + '/',
      category: cat.name,
    });
    // Per-tool entries
    for (const tool of cat.tools) {
      entries.push({
        type: 'tool',
        name: tool.name,
        summary: tool.summary || '',
        url: '/calculators/' + cat.slug + '/' + tool.slug + '/',
        category: cat.name,
      });
    }
  }
  // Top-level "all calculators" hub entry.
  entries.unshift({
    type: 'hub',
    name: 'All calculators',
    summary: 'Every calculator on the site, grouped by category.',
    url: '/calculators/',
    category: 'All',
  });
  return entries;
}

function buildLlmsTxt(pages, siteName, siteDescription, baseUrl) {
  const lines = [
    `# ${siteName}`,
    '',
    `> ${siteDescription}`,
    '',
    '## Pages',
    '',
  ];
  for (const p of pages) {
    const desc = p.description ? `: ${p.description}` : '';
    lines.push(`- [${p.title}](${baseUrl}${p.url})${desc}`);
  }
  lines.push('');
  return lines.join('\n');
}

function generate() {
  const pages = scanPages(SITE_DIR);

  // Remove any stale per-category sitemaps from a previous run so deleted
  // categories don't linger as orphan files.
  for (const f of fs.readdirSync(SITE_DIR)) {
    if (/^sitemap(-[a-z0-9-]+)?\.xml$/.test(f)) {
      fs.unlinkSync(path.join(SITE_DIR, f));
    }
  }

  const buckets = partitionPagesForSitemaps(pages);
  const today = new Date().toISOString().split('T')[0];
  for (const [filename, bucketPages] of buckets) {
    fs.writeFileSync(
      path.join(SITE_DIR, filename),
      buildSitemap(bucketPages, BASE_URL),
    );
  }
  fs.writeFileSync(
    path.join(SITE_DIR, 'sitemap.xml'),
    buildSitemapIndex([...buckets.keys()], BASE_URL, today),
  );
  fs.writeFileSync(path.join(SITE_DIR, 'robots.txt'), buildRobots(BASE_URL));
  fs.writeFileSync(
    path.join(SITE_DIR, 'llms.txt'),
    buildLlmsTxt(pages, SITE_NAME, SITE_DESCRIPTION, BASE_URL),
  );
  const categoriesPath = path.join(__dirname, '..', 'categories.json');
  if (fs.existsSync(categoriesPath)) {
    const searchIndex = buildSearchIndex(categoriesPath);
    const assetsDir = path.join(SITE_DIR, 'assets');
    if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
    fs.writeFileSync(
      path.join(assetsDir, 'search-index.json'),
      JSON.stringify(searchIndex),
    );
  }
  return pages.length;
}

module.exports = {
  scanPages,
  buildSitemap,
  buildSitemapIndex,
  partitionPagesForSitemaps,
  buildRobots,
  buildLlmsTxt,
  buildSearchIndex,
  generate,
  SITE_DIR,
  BASE_URL,
  SITE_NAME,
  SITE_DESCRIPTION,
};

if (require.main === module) {
  const count = generate();
  console.log(`Generated sitemap index + per-category sitemaps, robots.txt, llms.txt, search-index.json (${count} page${count === 1 ? '' : 's'})`);
}
