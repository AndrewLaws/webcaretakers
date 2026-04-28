'use strict';

var test = require('node:test');
var assert = require('node:assert');
var R = require('./robots-txt-tester');

test('parse: ignores comments and blank lines', function () {
  var p = R.parse('# a comment\n\n  # another\nUser-agent: *\nDisallow: /private/\n');
  assert.strictEqual(p.groups.length, 1);
  assert.deepStrictEqual(p.groups[0].agents, ['*']);
  assert.strictEqual(p.groups[0].rules.length, 1);
  assert.strictEqual(p.groups[0].rules[0].type, 'disallow');
  assert.strictEqual(p.groups[0].rules[0].path, '/private/');
});

test('parse: extracts sitemaps', function () {
  var p = R.parse('Sitemap: https://example.com/sitemap.xml\nUser-agent: *\nAllow: /\n');
  assert.deepStrictEqual(p.sitemaps, ['https://example.com/sitemap.xml']);
});

test('parse: groups merge consecutive User-agent lines', function () {
  var src = 'User-agent: Googlebot\nUser-agent: Bingbot\nDisallow: /no\n\nUser-agent: *\nAllow: /\n';
  var p = R.parse(src);
  assert.strictEqual(p.groups.length, 2);
  assert.deepStrictEqual(p.groups[0].agents.sort(), ['Bingbot', 'Googlebot']);
  assert.deepStrictEqual(p.groups[1].agents, ['*']);
});

test('parse: malformed lines are skipped', function () {
  var p = R.parse('this is rubbish\nUser-agent: *\nblah blah\nDisallow: /x\n');
  assert.strictEqual(p.groups.length, 1);
  assert.strictEqual(p.groups[0].rules.length, 1);
  // malformed lines should appear in warnings
  assert.ok(p.warnings.length >= 2);
});

test('parse: directive names are case-insensitive', function () {
  var p = R.parse('USER-AGENT: *\nDISALLOW: /a\nALLOW: /a/b\n');
  assert.strictEqual(p.groups.length, 1);
  assert.strictEqual(p.groups[0].rules.length, 2);
});

test('test: default to * group when UA not listed', function () {
  var p = R.parse('User-agent: *\nDisallow: /private/\n');
  var r = R.test(p, { url: '/private/page', userAgent: 'Googlebot' });
  assert.strictEqual(r.allowed, false);
  assert.strictEqual(r.matchedAgent, '*');
});

test('test: more specific UA group wins over *', function () {
  var src = 'User-agent: *\nDisallow: /\n\nUser-agent: Googlebot\nAllow: /\n';
  var p = R.parse(src);
  var r = R.test(p, { url: '/anything', userAgent: 'Googlebot' });
  assert.strictEqual(r.allowed, true);
  assert.strictEqual(r.matchedAgent, 'Googlebot');
});

test('test: UA matching is case-insensitive', function () {
  var p = R.parse('User-agent: googlebot\nDisallow: /x\n');
  var r = R.test(p, { url: '/x', userAgent: 'GoogleBot' });
  assert.strictEqual(r.allowed, false);
  assert.strictEqual(r.matchedAgent.toLowerCase(), 'googlebot');
});

test('test: longest matching path wins', function () {
  var src = 'User-agent: *\nDisallow: /a/\nAllow: /a/b/\n';
  var p = R.parse(src);
  var r = R.test(p, { url: '/a/b/page' });
  assert.strictEqual(r.allowed, true);
  assert.strictEqual(r.winningRule.type, 'allow');
  assert.strictEqual(r.winningRule.path, '/a/b/');
});

test('test: equal length tie-break, Allow beats Disallow', function () {
  var src = 'User-agent: *\nDisallow: /page\nAllow: /page\n';
  var p = R.parse(src);
  var r = R.test(p, { url: '/page' });
  assert.strictEqual(r.allowed, true);
  assert.strictEqual(r.winningRule.type, 'allow');
});

test('test: empty Disallow means allow everything', function () {
  var p = R.parse('User-agent: *\nDisallow:\n');
  var r = R.test(p, { url: '/anything/at/all' });
  assert.strictEqual(r.allowed, true);
});

test('test: empty Allow has no effect', function () {
  var src = 'User-agent: *\nDisallow: /x\nAllow:\n';
  var p = R.parse(src);
  var r = R.test(p, { url: '/x' });
  assert.strictEqual(r.allowed, false);
});

test('test: wildcard * matches any sequence', function () {
  var p = R.parse('User-agent: *\nDisallow: /*.pdf$\n');
  assert.strictEqual(R.test(p, { url: '/docs/file.pdf' }).allowed, false);
  assert.strictEqual(R.test(p, { url: '/file.pdf' }).allowed, false);
  assert.strictEqual(R.test(p, { url: '/file.pdf.txt' }).allowed, true);
  assert.strictEqual(R.test(p, { url: '/file.html' }).allowed, true);
});

test('test: $ anchors end of URL', function () {
  var p = R.parse('User-agent: *\nDisallow: /exact$\n');
  assert.strictEqual(R.test(p, { url: '/exact' }).allowed, false);
  assert.strictEqual(R.test(p, { url: '/exact/' }).allowed, true);
  assert.strictEqual(R.test(p, { url: '/exactly' }).allowed, true);
});

test('test: paths are case-sensitive', function () {
  var p = R.parse('User-agent: *\nDisallow: /Private/\n');
  assert.strictEqual(R.test(p, { url: '/Private/x' }).allowed, false);
  assert.strictEqual(R.test(p, { url: '/private/x' }).allowed, true);
});

test('test: full URL input has host stripped', function () {
  var p = R.parse('User-agent: *\nDisallow: /admin/\n');
  var r = R.test(p, { url: 'https://example.com/admin/login' });
  assert.strictEqual(r.allowed, false);
  assert.strictEqual(r.path, '/admin/login');
});

test('test: path without leading slash is normalised', function () {
  var p = R.parse('User-agent: *\nDisallow: /admin/\n');
  var r = R.test(p, { url: 'admin/login' });
  assert.strictEqual(r.allowed, false);
});

test('test: no group matches and no * group means allow', function () {
  var p = R.parse('User-agent: Googlebot\nDisallow: /\n');
  var r = R.test(p, { url: '/anything', userAgent: 'Bingbot' });
  assert.strictEqual(r.allowed, true);
  assert.strictEqual(r.matchedAgent, null);
});

test('test: candidate rules are returned for prove-it', function () {
  var src = 'User-agent: *\nDisallow: /a/\nAllow: /a/b/\nDisallow: /a/b/c\n';
  var p = R.parse(src);
  var r = R.test(p, { url: '/a/b/c/d' });
  assert.ok(Array.isArray(r.candidates));
  assert.strictEqual(r.candidates.length, 3);
  // Winner is the longest, /a/b/c (Disallow), length 6 > /a/b/ length 5 > /a/ length 3.
  assert.strictEqual(r.allowed, false);
  assert.strictEqual(r.winningRule.path, '/a/b/c');
});

test('test: empty robots.txt allows everything', function () {
  var p = R.parse('');
  var r = R.test(p, { url: '/anything' });
  assert.strictEqual(r.allowed, true);
});

test('test: most specific UA wins even with multiple bots', function () {
  var src = 'User-agent: *\nDisallow: /\n\nUser-agent: Googlebot-Image\nDisallow: /no-img/\n\nUser-agent: Googlebot\nAllow: /\n';
  var p = R.parse(src);
  // Googlebot-Image is its own UA, gets its own group, not the Googlebot group.
  var r1 = R.test(p, { url: '/no-img/x', userAgent: 'Googlebot-Image' });
  assert.strictEqual(r1.allowed, false);
  // Plain Googlebot gets the Googlebot group.
  var r2 = R.test(p, { url: '/anything', userAgent: 'Googlebot' });
  assert.strictEqual(r2.allowed, true);
});

test('testMany: returns one row per URL', function () {
  var p = R.parse('User-agent: *\nDisallow: /private/\n');
  var rows = R.testMany(p, { urls: ['/public', '/private/x', '/private/'], userAgent: '*' });
  assert.strictEqual(rows.length, 3);
  assert.strictEqual(rows[0].allowed, true);
  assert.strictEqual(rows[1].allowed, false);
  assert.strictEqual(rows[2].allowed, false);
});
