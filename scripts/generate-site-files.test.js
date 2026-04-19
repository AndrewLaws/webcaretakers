const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {
  scanPages,
  buildSitemap,
  buildRobots,
  buildLlmsTxt,
} = require('./generate-site-files');

function makeFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wc-site-'));
  fs.writeFileSync(
    path.join(dir, 'index.html'),
    `<!DOCTYPE html><html><head><title>Home</title>` +
      `<meta name="description" content="Root page"></head><body></body></html>`,
  );
  const sub = path.join(dir, 'calculators', 'finance', 'roi');
  fs.mkdirSync(sub, { recursive: true });
  fs.writeFileSync(
    path.join(sub, 'index.html'),
    `<!DOCTYPE html><html><head><title>ROI Calculator</title>` +
      `<meta name="description" content="Work out your return on investment."></head><body></body></html>`,
  );
  return dir;
}

test('scanPages finds every index.html and maps to clean URLs', () => {
  const dir = makeFixture();
  const pages = scanPages(dir);
  const urls = pages.map((p) => p.url).sort();
  assert.deepEqual(urls, ['/', '/calculators/finance/roi/']);
});

test('scanPages extracts title and meta description', () => {
  const dir = makeFixture();
  const pages = scanPages(dir);
  const home = pages.find((p) => p.url === '/');
  assert.equal(home.title, 'Home');
  assert.equal(home.description, 'Root page');
});

test('scanPages sorts pages alphabetically by URL for stable output', () => {
  const dir = makeFixture();
  const pages = scanPages(dir);
  const urls = pages.map((p) => p.url);
  assert.deepEqual(urls, [...urls].sort());
});

test('buildSitemap produces valid XML with every page and lastmod', () => {
  const pages = [
    { path: '/a', url: '/', title: 'A', description: '' },
    { path: '/b', url: '/calculators/x/', title: 'B', description: '' },
  ];
  const xml = buildSitemap(pages, 'https://example.com', () => '2026-04-19');
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.ok(xml.includes('<loc>https://example.com/</loc>'));
  assert.ok(xml.includes('<loc>https://example.com/calculators/x/</loc>'));
  assert.ok(xml.includes('<lastmod>2026-04-19</lastmod>'));
  assert.ok(xml.trimEnd().endsWith('</urlset>'));
});

test('buildRobots allows all crawlers and references the sitemap', () => {
  const robots = buildRobots('https://example.com');
  assert.ok(robots.includes('User-agent: *'));
  assert.ok(robots.includes('Allow: /'));
  assert.ok(robots.includes('Sitemap: https://example.com/sitemap.xml'));
});

test('buildLlmsTxt lists every page with title, url, and description', () => {
  const pages = [
    { url: '/', title: 'Home', description: 'Root page' },
    { url: '/calculators/x/', title: 'Calc X', description: 'Does X' },
  ];
  const txt = buildLlmsTxt(pages, 'Site', 'Site desc', 'https://example.com');
  assert.ok(txt.startsWith('# Site'));
  assert.ok(txt.includes('> Site desc'));
  assert.ok(txt.includes('[Home](https://example.com/): Root page'));
  assert.ok(txt.includes('[Calc X](https://example.com/calculators/x/): Does X'));
});
