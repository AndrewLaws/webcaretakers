const { test } = require('node:test');
const assert = require('node:assert');
const {
  parseSitemapIndex,
  parseUrlSet,
  diffUrls,
  buildPayload,
  chunkUrls,
} = require('./post-deploy-index-ping');

test('parseSitemapIndex extracts <loc> URLs from a sitemapindex', () => {
  const xml = `<?xml version="1.0"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://example.com/a.xml</loc><lastmod>2026-04-30</lastmod></sitemap>
  <sitemap><loc>https://example.com/b.xml</loc></sitemap>
</sitemapindex>`;
  assert.deepStrictEqual(parseSitemapIndex(xml), [
    'https://example.com/a.xml',
    'https://example.com/b.xml',
  ]);
});

test('parseSitemapIndex returns [] for an empty or missing index', () => {
  assert.deepStrictEqual(parseSitemapIndex('<sitemapindex></sitemapindex>'), []);
  assert.deepStrictEqual(parseSitemapIndex(''), []);
});

test('parseUrlSet extracts <loc> URLs from a urlset', () => {
  const xml = `<?xml version="1.0"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/one/</loc><lastmod>2026-04-30</lastmod></url>
  <url><loc>https://example.com/two/</loc></url>
</urlset>`;
  assert.deepStrictEqual(parseUrlSet(xml), [
    'https://example.com/one/',
    'https://example.com/two/',
  ]);
});

test('parseUrlSet trims whitespace inside <loc>', () => {
  const xml = `<urlset><url><loc>
    https://example.com/spaced/
  </loc></url></urlset>`;
  assert.deepStrictEqual(parseUrlSet(xml), ['https://example.com/spaced/']);
});

test('diffUrls returns URLs in next that are not in prev', () => {
  const prev = ['a', 'b', 'c'];
  const next = ['b', 'c', 'd', 'e'];
  assert.deepStrictEqual(diffUrls(prev, next).added.sort(), ['d', 'e']);
});

test('diffUrls.added is empty when nothing has changed', () => {
  assert.deepStrictEqual(diffUrls(['a', 'b'], ['a', 'b']).added, []);
});

test('diffUrls.added is the full next list when prev is empty', () => {
  assert.deepStrictEqual(diffUrls([], ['a', 'b']).added.sort(), ['a', 'b']);
});

test('diffUrls also reports removed URLs (informational, not pinged)', () => {
  const prev = ['a', 'b', 'c'];
  const next = ['b'];
  const d = diffUrls(prev, next);
  assert.deepStrictEqual(d.added, []);
  assert.deepStrictEqual(d.removed.sort(), ['a', 'c']);
});

test('buildPayload produces the IndexNow request body shape', () => {
  const payload = buildPayload({
    host: 'webcaretakers.com',
    key: 'abc123',
    keyLocation: 'https://webcaretakers.com/abc123.txt',
    urlList: ['https://webcaretakers.com/x/', 'https://webcaretakers.com/y/'],
  });
  assert.strictEqual(payload.host, 'webcaretakers.com');
  assert.strictEqual(payload.key, 'abc123');
  assert.strictEqual(payload.keyLocation, 'https://webcaretakers.com/abc123.txt');
  assert.deepStrictEqual(payload.urlList, [
    'https://webcaretakers.com/x/',
    'https://webcaretakers.com/y/',
  ]);
});

test('chunkUrls returns a single chunk when below the limit', () => {
  const urls = Array.from({ length: 5 }, (_, i) => `u${i}`);
  const chunks = chunkUrls(urls, 10000);
  assert.strictEqual(chunks.length, 1);
  assert.strictEqual(chunks[0].length, 5);
});

test('chunkUrls splits on the size boundary', () => {
  const urls = Array.from({ length: 25 }, (_, i) => `u${i}`);
  const chunks = chunkUrls(urls, 10);
  assert.strictEqual(chunks.length, 3);
  assert.deepStrictEqual(chunks.map((c) => c.length), [10, 10, 5]);
});

test('chunkUrls returns [] for an empty input', () => {
  assert.deepStrictEqual(chunkUrls([], 10), []);
});
