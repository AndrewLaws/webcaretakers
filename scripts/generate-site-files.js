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

function buildRobots(baseUrl) {
  return [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${baseUrl}/sitemap.xml`,
    '',
  ].join('\n');
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
  fs.writeFileSync(
    path.join(SITE_DIR, 'sitemap.xml'),
    buildSitemap(pages, BASE_URL),
  );
  fs.writeFileSync(path.join(SITE_DIR, 'robots.txt'), buildRobots(BASE_URL));
  fs.writeFileSync(
    path.join(SITE_DIR, 'llms.txt'),
    buildLlmsTxt(pages, SITE_NAME, SITE_DESCRIPTION, BASE_URL),
  );
  return pages.length;
}

module.exports = {
  scanPages,
  buildSitemap,
  buildRobots,
  buildLlmsTxt,
  generate,
  SITE_DIR,
  BASE_URL,
  SITE_NAME,
  SITE_DESCRIPTION,
};

if (require.main === module) {
  const count = generate();
  console.log(`Generated sitemap.xml, robots.txt, llms.txt (${count} page${count === 1 ? '' : 's'})`);
}
