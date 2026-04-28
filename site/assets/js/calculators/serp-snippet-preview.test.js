'use strict';

var test = require('node:test');
var assert = require('node:assert');
var S = require('./serp-snippet-preview');

// A deterministic per-character width function we inject into the
// library so tests do not depend on a real canvas. Each character has
// width equal to its code point modulo 13 plus 6, so we get reproducible
// totals without pretending to be Arial.
function fakeMeasure(text, font) {
  void font;
  var w = 0;
  for (var i = 0; i < text.length; i++) {
    w += (text.charCodeAt(i) % 13) + 6;
  }
  return w;
}

test('measureWidth: returns 0 for empty string', function () {
  assert.strictEqual(S.measureWidth('', '20px Arial', fakeMeasure), 0);
});

test('measureWidth: grows with each character added', function () {
  var a = S.measureWidth('hello', '20px Arial', fakeMeasure);
  var b = S.measureWidth('hello world', '20px Arial', fakeMeasure);
  assert.ok(b > a, 'longer string should be wider');
});

test('truncateToWidth: returns text unchanged when it fits', function () {
  var out = S.truncateToWidth('short', 10000, '20px Arial', fakeMeasure);
  assert.strictEqual(out.text, 'short');
  assert.strictEqual(out.truncated, false);
});

test('truncateToWidth: appends ellipsis when over the limit', function () {
  var input = 'A title that is far too long to fit inside the very small budget we are giving it';
  var out = S.truncateToWidth(input, 100, '20px Arial', fakeMeasure);
  assert.strictEqual(out.truncated, true);
  assert.ok(out.text.endsWith('...'), 'truncated output should end with ellipsis, got: ' + out.text);
  // The truncated string itself, ellipsis included, must be within the budget.
  assert.ok(S.measureWidth(out.text, '20px Arial', fakeMeasure) <= 100,
    'truncated output width should not exceed budget');
});

test('truncateToWidth: empty input passes through unchanged', function () {
  var out = S.truncateToWidth('', 600, '20px Arial', fakeMeasure);
  assert.strictEqual(out.text, '');
  assert.strictEqual(out.truncated, false);
});

test('wrapToLines: returns single line when text fits', function () {
  var out = S.wrapToLines('one two', 10000, 3, '14px Arial', fakeMeasure);
  assert.deepStrictEqual(out.lines, ['one two']);
  assert.strictEqual(out.truncated, false);
});

test('wrapToLines: wraps onto multiple lines respecting maxLines', function () {
  var input = 'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau';
  var out = S.wrapToLines(input, 80, 2, '14px Arial', fakeMeasure);
  assert.strictEqual(out.lines.length, 2);
  // Last line should end with ellipsis because content was truncated.
  assert.ok(out.lines[1].endsWith('...'), 'last line should end with ellipsis when content is cut off');
  assert.strictEqual(out.truncated, true);
});

test('wrapToLines: hard newlines in input become line breaks', function () {
  var out = S.wrapToLines('line one\nline two', 10000, 3, '14px Arial', fakeMeasure);
  assert.deepStrictEqual(out.lines, ['line one', 'line two']);
});

test('wrapToLines: a word longer than the budget is force-broken', function () {
  // Single token wider than the line budget.
  var out = S.wrapToLines('supercalifragilisticexpialidocious', 50, 3, '14px Arial', fakeMeasure);
  // We expect at least one line, and the rendered text starts with the word's prefix.
  assert.ok(out.lines.length >= 1);
  // Each line must fit the budget (with allowance for the ellipsis).
  for (var i = 0; i < out.lines.length; i++) {
    var w = S.measureWidth(out.lines[i], '14px Arial', fakeMeasure);
    assert.ok(w <= 50 + 1, 'line ' + i + ' too wide: ' + w);
  }
});

test('formatBreadcrumb: bare host', function () {
  assert.strictEqual(S.formatBreadcrumb('https://example.com/'), 'example.com');
  assert.strictEqual(S.formatBreadcrumb('https://example.com'), 'example.com');
});

test('formatBreadcrumb: path with subdirectories renders chevrons', function () {
  var out = S.formatBreadcrumb('https://example.com/blog/2024/post-name');
  // Use a normal greater-than as the separator; the UI replaces with the chevron glyph.
  assert.strictEqual(out, 'example.com > blog > 2024 > post-name');
});

test('formatBreadcrumb: trailing slash and hyphens preserved', function () {
  var out = S.formatBreadcrumb('https://example.com/help/setting-up-a-new-account/');
  assert.strictEqual(out, 'example.com > help > setting-up-a-new-account');
});

test('formatBreadcrumb: slug without scheme still works', function () {
  assert.strictEqual(S.formatBreadcrumb('example.com/foo/bar'), 'example.com > foo > bar');
});

test('formatBreadcrumb: empty input returns empty string', function () {
  assert.strictEqual(S.formatBreadcrumb(''), '');
  assert.strictEqual(S.formatBreadcrumb(null), '');
});

test('analyseTitle: warns when desktop budget is exceeded but mobile fits', function () {
  // Build a title that uses width 700 in our fake function, with a small mobile budget bigger than it.
  var title = 'Repeating chars to push width up '.repeat(3);
  var desk = S.analyseTitle(title, { budget: 300, font: '20px Arial' }, fakeMeasure);
  var mob  = S.analyseTitle(title, { budget: 5000, font: '20px Arial' }, fakeMeasure);
  assert.strictEqual(desk.truncated, true);
  assert.strictEqual(mob.truncated, false);
  assert.ok(desk.rawWidth > 300);
  assert.strictEqual(desk.budget, 300);
});

test('analyseDescription: returns wrapped lines and pixel width', function () {
  var desc = 'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen';
  var out = S.analyseDescription(desc, { budget: 80, maxLines: 2, font: '14px Arial' }, fakeMeasure);
  assert.ok(out.lines.length <= 2);
  assert.ok(typeof out.width === 'number');
  assert.ok(typeof out.budget === 'number');
});

test('analyseTitle: handles em-dashes and emoji without crashing', function () {
  var out = S.analyseTitle('Pricing — plans and offers 🚀', { budget: 600, font: '20px Arial' }, fakeMeasure);
  assert.ok(typeof out.width === 'number');
  assert.ok(out.text.length > 0);
});
