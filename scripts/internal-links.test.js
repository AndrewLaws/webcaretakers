const { test } = require('node:test');
const assert = require('node:assert/strict');
const { applyLinksToHtml } = require('./internal-links.js');

const config = {
  links: [
    { phrase: 'Broadband Bandwidth Calculator', url: '/calculators/broadband/broadband-bandwidth-calculator/' },
    { phrase: 'bandwidth calculator', url: '/calculators/broadband/broadband-bandwidth-calculator/' },
    { phrase: 'privacy policy', url: '/privacy/' }
  ],
  excludeFromLinking: ['/privacy/']
};

function wrap(bodyHtml) {
  return `<!DOCTYPE html><html><head><title>t</title></head><body>${bodyHtml}</body></html>`;
}

test('wraps first occurrence of a phrase in an anchor', () => {
  const html = wrap('<main><p>Use the Broadband Bandwidth Calculator to plan.</p></main>');
  const res = applyLinksToHtml(html, { config, currentUrl: '/' });
  assert.match(res.html, /<a href="\/calculators\/broadband\/broadband-bandwidth-calculator\/">Broadband Bandwidth Calculator<\/a>/);
  assert.equal(res.inserted.length, 1);
});

test('is case-insensitive but preserves original casing', () => {
  const html = wrap('<main><p>a broadband bandwidth calculator is useful</p></main>');
  const res = applyLinksToHtml(html, { config, currentUrl: '/' });
  assert.match(res.html, /<a [^>]+>broadband bandwidth calculator<\/a>/);
});

test('only wraps the first occurrence per page per URL', () => {
  const html = wrap('<main><p>First bandwidth calculator. Then another bandwidth calculator.</p></main>');
  const res = applyLinksToHtml(html, { config, currentUrl: '/' });
  const matches = res.html.match(/<a [^>]+>bandwidth calculator<\/a>/g) || [];
  assert.equal(matches.length, 1);
});

test('does not double-wrap already linked phrases (idempotent)', () => {
  const html = wrap('<main><p>Use the <a href="/calculators/broadband/broadband-bandwidth-calculator/">Broadband Bandwidth Calculator</a> today.</p></main>');
  const res = applyLinksToHtml(html, { config, currentUrl: '/' });
  const anchors = res.html.match(/<a [^>]+>Broadband Bandwidth Calculator<\/a>/g) || [];
  assert.equal(anchors.length, 1);
  assert.equal(res.inserted.length, 0);
});

test('running twice produces the same output', () => {
  const html = wrap('<main><p>The Broadband Bandwidth Calculator is here.</p></main>');
  const once = applyLinksToHtml(html, { config, currentUrl: '/' }).html;
  const twice = applyLinksToHtml(once, { config, currentUrl: '/' }).html;
  assert.equal(once, twice);
});

test('skips nav, header, footer, script, style', () => {
  const html = wrap('<nav><a href="/x">Broadband Bandwidth Calculator</a></nav><footer><p>Broadband Bandwidth Calculator</p></footer><script>var Broadband Bandwidth Calculator = 1;</script>');
  const res = applyLinksToHtml(html, { config, currentUrl: '/' });
  // The footer paragraph should not get wrapped
  assert.doesNotMatch(res.html, /<footer><p><a /);
  assert.equal(res.inserted.length, 0);
});

test('skips headings by default', () => {
  const html = wrap('<main><h2>Broadband Bandwidth Calculator</h2><p>some text</p></main>');
  const res = applyLinksToHtml(html, { config, currentUrl: '/' });
  assert.doesNotMatch(res.html, /<h2><a /);
});

test('does not self-link', () => {
  const html = wrap('<main><p>This Broadband Bandwidth Calculator page.</p></main>');
  const res = applyLinksToHtml(html, {
    config,
    currentUrl: '/calculators/broadband/broadband-bandwidth-calculator/'
  });
  assert.doesNotMatch(res.html, /<a [^>]+>Broadband Bandwidth Calculator<\/a>/);
  assert.equal(res.inserted.length, 0);
});

test('skips pages listed in excludeFromLinking', () => {
  const html = wrap('<main><p>Our privacy policy matters.</p></main>');
  const res = applyLinksToHtml(html, {
    config,
    currentUrl: '/privacy/'
  });
  // From /privacy/ we do not inject anything
  assert.doesNotMatch(res.html, /<a [^>]+>privacy policy<\/a>/);
  assert.equal(res.inserted.length, 0);
});

test('prefers longer phrases over shorter ones at the same spot', () => {
  const html = wrap('<main><p>The Broadband Bandwidth Calculator is here.</p></main>');
  const res = applyLinksToHtml(html, { config, currentUrl: '/' });
  // Should link the full phrase, not just "bandwidth calculator"
  assert.match(res.html, /<a [^>]+>Broadband Bandwidth Calculator<\/a>/);
  assert.doesNotMatch(res.html, /Broadband <a [^>]+>bandwidth calculator<\/a>/i);
});

test('only matches whole words (not substrings inside other words)', () => {
  const html = wrap('<main><p>superbandwidth calculatorville is not a real word.</p></main>');
  const res = applyLinksToHtml(html, { config, currentUrl: '/' });
  // Should not wrap because it's part of a longer word
  assert.doesNotMatch(res.html, /<a /);
});

test('reports which links were inserted with the source page', () => {
  const html = wrap('<main><p>The Broadband Bandwidth Calculator helps.</p></main>');
  const res = applyLinksToHtml(html, { config, currentUrl: '/foo/' });
  assert.equal(res.inserted.length, 1);
  assert.equal(res.inserted[0].phrase, 'Broadband Bandwidth Calculator');
  assert.equal(res.inserted[0].url, '/calculators/broadband/broadband-bandwidth-calculator/');
});
