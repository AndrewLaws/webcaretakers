const { test } = require('node:test');
const assert = require('node:assert');
const {
  extractMeta,
  classifyCountryTarget,
  validateMeta,
  detectDuplicates,
} = require('./audit-meta');

const HTML = (overrides = {}) => {
  const d = {
    title: 'BMI Calculator | WebCaretakers',
    description: 'Work out your BMI in metric or imperial. Honest about what BMI can and cannot tell you.',
    canonical: 'https://webcaretakers.com/calculators/health/bmi-calculator/',
    h1: 'BMI Calculator',
    robots: 'index, follow',
    ogTitle: 'BMI Calculator | WebCaretakers',
    ogDescription: 'Work out your BMI in metric or imperial.',
    ogUrl: 'https://webcaretakers.com/calculators/health/bmi-calculator/',
    twitterCard: 'summary_large_image',
    hreflang: '',
    htmlLang: 'en-GB',
    ...overrides,
  };
  return `<!DOCTYPE html>
<html lang="${d.htmlLang}">
<head>
  <title>${d.title}</title>
  <meta name="description" content="${d.description}">
  <link rel="canonical" href="${d.canonical}">
  <meta name="robots" content="${d.robots}">
  <meta property="og:title" content="${d.ogTitle}">
  <meta property="og:description" content="${d.ogDescription}">
  <meta property="og:url" content="${d.ogUrl}">
  <meta name="twitter:card" content="${d.twitterCard}">
  ${d.hreflang}
</head>
<body><h1>${d.h1}</h1></body>
</html>`;
};

test('extractMeta pulls title, description, canonical, h1, robots, og, twitter, htmlLang', () => {
  const m = extractMeta(HTML());
  assert.strictEqual(m.title, 'BMI Calculator | WebCaretakers');
  assert.strictEqual(m.description, 'Work out your BMI in metric or imperial. Honest about what BMI can and cannot tell you.');
  assert.strictEqual(m.canonical, 'https://webcaretakers.com/calculators/health/bmi-calculator/');
  assert.strictEqual(m.h1, 'BMI Calculator');
  assert.strictEqual(m.h1Count, 1);
  assert.strictEqual(m.robots, 'index, follow');
  assert.strictEqual(m.ogTitle, 'BMI Calculator | WebCaretakers');
  assert.strictEqual(m.htmlLang, 'en-GB');
  assert.strictEqual(m.twitterCard, 'summary_large_image');
});

test('extractMeta counts multiple h1s', () => {
  const html = HTML().replace('<h1>BMI Calculator</h1>', '<h1>BMI</h1><h1>Calculator</h1>');
  assert.strictEqual(extractMeta(html).h1Count, 2);
});

test('extractMeta returns empty strings for missing fields, not undefined', () => {
  const m = extractMeta('<html><head></head><body></body></html>');
  assert.strictEqual(m.title, '');
  assert.strictEqual(m.description, '');
  assert.strictEqual(m.canonical, '');
  assert.strictEqual(m.h1Count, 0);
});

test('extractMeta collects all hreflang link rels', () => {
  const html = HTML({
    hreflang: `
    <link rel="alternate" hreflang="en-GB" href="https://webcaretakers.com/calculators/finance/uk-mortgage-calculator/">
    <link rel="alternate" hreflang="en-US" href="https://webcaretakers.com/calculators/finance/mortgage-calculator/">
    <link rel="alternate" hreflang="x-default" href="https://webcaretakers.com/calculators/finance/mortgage-calculator/">`,
  });
  const m = extractMeta(html);
  assert.strictEqual(m.hreflangs.length, 3);
  assert.strictEqual(m.hreflangs[0].lang, 'en-GB');
  assert.ok(m.hreflangs.some((h) => h.lang === 'x-default'));
});

test('classifyCountryTarget detects UK-prefixed slugs', () => {
  assert.strictEqual(classifyCountryTarget('/calculators/finance/uk-mortgage-calculator/'), 'uk');
});

test('classifyCountryTarget detects US-prefixed slugs', () => {
  assert.strictEqual(classifyCountryTarget('/calculators/finance/us-tax-calculator/'), 'us');
});

test('classifyCountryTarget returns null for global calculators', () => {
  assert.strictEqual(classifyCountryTarget('/calculators/health/bmi-calculator/'), null);
});

test('validateMeta flags missing title', () => {
  const errors = validateMeta(extractMeta(HTML({ title: '' })), '/calculators/x/');
  assert.ok(errors.some((e) => /title.*missing/i.test(e)));
});

test('validateMeta flags overlong title (over 60 chars)', () => {
  const long = 'A'.repeat(80);
  const errors = validateMeta(extractMeta(HTML({ title: long })), '/calculators/x/');
  assert.ok(errors.some((e) => /title.*too long/i.test(e)));
});

test('validateMeta flags overshort title (under 30 chars)', () => {
  const errors = validateMeta(extractMeta(HTML({ title: 'BMI' })), '/calculators/x/');
  assert.ok(errors.some((e) => /title.*too short/i.test(e)));
});

test('validateMeta flags missing description', () => {
  const errors = validateMeta(extractMeta(HTML({ description: '' })), '/calculators/x/');
  assert.ok(errors.some((e) => /description.*missing/i.test(e)));
});

test('validateMeta flags overlong description (over 160 chars)', () => {
  const errors = validateMeta(extractMeta(HTML({ description: 'A'.repeat(200) })), '/calculators/x/');
  assert.ok(errors.some((e) => /description.*too long/i.test(e)));
});

test('validateMeta flags missing canonical', () => {
  const errors = validateMeta(extractMeta(HTML({ canonical: '' })), '/calculators/x/');
  assert.ok(errors.some((e) => /canonical.*missing/i.test(e)));
});

test('validateMeta flags pages with no h1', () => {
  const html = HTML().replace('<h1>BMI Calculator</h1>', '');
  const errors = validateMeta(extractMeta(html), '/calculators/x/');
  assert.ok(errors.some((e) => /h1.*missing/i.test(e)));
});

test('validateMeta flags pages with multiple h1s', () => {
  const html = HTML().replace('<h1>BMI Calculator</h1>', '<h1>A</h1><h1>B</h1>');
  const errors = validateMeta(extractMeta(html), '/calculators/x/');
  assert.ok(errors.some((e) => /multiple h1/i.test(e)));
});

test('validateMeta flags noindex robots', () => {
  const errors = validateMeta(extractMeta(HTML({ robots: 'noindex, follow' })), '/calculators/x/');
  assert.ok(errors.some((e) => /noindex/i.test(e)));
});

test('validateMeta requires hreflang on UK-prefixed calculator pages', () => {
  // No hreflang at all on a UK-targeted page should warn.
  const errors = validateMeta(
    extractMeta(HTML()),
    '/calculators/finance/uk-mortgage-calculator/'
  );
  assert.ok(errors.some((e) => /hreflang/i.test(e)));
});

test('validateMeta passes UK-prefixed page when hreflang en-GB and x-default are present', () => {
  const m = extractMeta(HTML({
    hreflang: `
    <link rel="alternate" hreflang="en-GB" href="https://webcaretakers.com/calculators/finance/uk-mortgage-calculator/">
    <link rel="alternate" hreflang="x-default" href="https://webcaretakers.com/calculators/finance/mortgage-calculator/">`,
  }));
  const errors = validateMeta(m, '/calculators/finance/uk-mortgage-calculator/');
  assert.ok(!errors.some((e) => /hreflang/i.test(e)));
});

test('detectDuplicates groups pages by exact title match', () => {
  const rows = [
    { url: '/a/', title: 'Same Title', description: 'd1' },
    { url: '/b/', title: 'Same Title', description: 'd2' },
    { url: '/c/', title: 'Different', description: 'd3' },
  ];
  const dupes = detectDuplicates(rows, 'title');
  assert.strictEqual(dupes.length, 1);
  assert.deepStrictEqual(dupes[0].urls.sort(), ['/a/', '/b/']);
  assert.strictEqual(dupes[0].value, 'Same Title');
});

test('detectDuplicates returns [] when all values are unique', () => {
  const rows = [
    { url: '/a/', title: 'A' },
    { url: '/b/', title: 'B' },
  ];
  assert.deepStrictEqual(detectDuplicates(rows, 'title'), []);
});
