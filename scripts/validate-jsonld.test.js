const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const {
  extractJsonLdBlocks,
  classifyPage,
  validatePage,
} = require('./validate-jsonld');

const SITE_ROOT = path.resolve(__dirname, '..', 'site');

function fakePage(types) {
  return types.map((t) => ({ '@context': 'https://schema.org', '@type': t }));
}

test('extractJsonLdBlocks parses every <script type="application/ld+json"> block', () => {
  const html = `
    <html><head>
      <script type="application/ld+json">{"@type":"WebSite"}</script>
      <script type="application/ld+json">{"@type":"Organization"}</script>
    </head></html>
  `;
  const blocks = extractJsonLdBlocks(html);
  assert.strictEqual(blocks.length, 2);
  assert.strictEqual(blocks[0]['@type'], 'WebSite');
});

test('extractJsonLdBlocks throws on invalid JSON so the build fails loudly', () => {
  const html = `<script type="application/ld+json">{ not json }</script>`;
  assert.throws(() => extractJsonLdBlocks(html), /JSON/);
});

test('classifyPage identifies the homepage', () => {
  assert.strictEqual(
    classifyPage(path.join(SITE_ROOT, 'index.html'), SITE_ROOT),
    'homepage'
  );
});

test('classifyPage identifies a category hub', () => {
  assert.strictEqual(
    classifyPage(path.join(SITE_ROOT, 'calculators', 'health', 'index.html'), SITE_ROOT),
    'category-hub'
  );
});

test('classifyPage identifies a calculator page', () => {
  assert.strictEqual(
    classifyPage(
      path.join(SITE_ROOT, 'calculators', 'health', 'bmi-calculator', 'index.html'),
      SITE_ROOT
    ),
    'calculator'
  );
});

test('classifyPage returns "other" for unrelated pages (about, privacy, contact)', () => {
  assert.strictEqual(
    classifyPage(path.join(SITE_ROOT, 'about', 'index.html'), SITE_ROOT),
    'other'
  );
  assert.strictEqual(
    classifyPage(path.join(SITE_ROOT, 'calculators', 'index.html'), SITE_ROOT),
    'other'
  );
});

test('validatePage requires SoftwareApplication, FAQPage and BreadcrumbList on calculator pages', () => {
  const blocks = [
    { '@type': 'SoftwareApplication' },
    { '@type': 'FAQPage', mainEntity: [{ '@type': 'Question' }] },
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem' }] },
  ];
  assert.deepStrictEqual(validatePage('calculator', blocks), []);
});

test('validatePage flags a calculator page missing SoftwareApplication', () => {
  const errors = validatePage('calculator', fakePage(['FAQPage', 'BreadcrumbList']));
  assert.ok(errors.some((e) => /SoftwareApplication/.test(e)));
});

test('validatePage flags a calculator page missing BreadcrumbList', () => {
  const errors = validatePage('calculator', fakePage(['SoftwareApplication', 'FAQPage']));
  assert.ok(errors.some((e) => /BreadcrumbList/.test(e)));
});

test('validatePage requires CollectionPage, ItemList and BreadcrumbList on category hubs', () => {
  const blocks = [
    { '@type': 'CollectionPage' },
    { '@type': 'ItemList', itemListElement: [{ '@type': 'ListItem' }] },
    { '@type': 'BreadcrumbList' },
  ];
  assert.deepStrictEqual(validatePage('category-hub', blocks), []);
});

test('validatePage flags a category hub missing ItemList', () => {
  const errors = validatePage('category-hub', fakePage(['CollectionPage', 'BreadcrumbList']));
  assert.ok(errors.some((e) => /ItemList/.test(e)));
});

test('validatePage requires WebSite and Organization on the homepage', () => {
  const errors = validatePage('homepage', fakePage(['WebSite', 'Organization']));
  assert.deepStrictEqual(errors, []);
});

test('validatePage flags a homepage missing WebSite', () => {
  const errors = validatePage('homepage', fakePage(['Organization']));
  assert.ok(errors.some((e) => /WebSite/.test(e)));
});

test('validatePage rejects a calculator page with an empty FAQPage mainEntity (fabricated FAQ)', () => {
  const blocks = [
    { '@type': 'SoftwareApplication' },
    { '@type': 'FAQPage', mainEntity: [] },
    { '@type': 'BreadcrumbList' },
  ];
  const errors = validatePage('calculator', blocks);
  assert.ok(errors.some((e) => /FAQPage.*empty/i.test(e)));
});

test('validatePage rejects a BreadcrumbList with no itemListElement', () => {
  const blocks = [
    { '@type': 'SoftwareApplication' },
    { '@type': 'FAQPage', mainEntity: [{ '@type': 'Question' }] },
    { '@type': 'BreadcrumbList' },
  ];
  const errors = validatePage('calculator', blocks);
  assert.ok(errors.some((e) => /BreadcrumbList.*itemListElement/i.test(e)));
});
