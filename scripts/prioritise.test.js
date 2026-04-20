const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  parseCandidates,
  scoreRow,
  buildRow,
  buildPrioritiesMarkdown,
} = require('./prioritise');

test('parseCandidates strips blanks, comments, and trims whitespace', () => {
  const input = [
    '# SEMrush candidate list',
    '',
    '  bmi calculator  ',
    'mortgage calculator',
    '# commented out',
    'stamp duty calculator',
    '',
  ].join('\n');
  assert.deepEqual(parseCandidates(input), [
    'bmi calculator',
    'mortgage calculator',
    'stamp duty calculator',
  ]);
});

test('scoreRow returns 0 when volume or CPC is missing', () => {
  assert.equal(scoreRow({ volume: 0, cpc: 1.5, competition: 0.2 }), 0);
  assert.equal(scoreRow({ volume: 1000, cpc: 0, competition: 0.2 }), 0);
});

test('scoreRow applies volume * CPC * (1 - competition)', () => {
  // 10,000 * 2.00 * (1 - 0.25) = 15,000
  assert.equal(scoreRow({ volume: 10000, cpc: 2.0, competition: 0.25 }), 15000);
});

test('scoreRow treats missing competition as 0 (unknown is not a penalty)', () => {
  assert.equal(scoreRow({ volume: 1000, cpc: 1, competition: null }), 1000);
});

test('buildRow extracts keyword, volume, CPC, and competition from a SEMrush phrase_this row', () => {
  const semrush = {
    phrase: [
      {
        Keyword: 'bmi calculator',
        'Search Volume': '450000',
        CPC: '1.23',
        Competition: '0.34',
      },
    ],
    related: [],
  };
  const row = buildRow('bmi calculator', semrush);
  assert.equal(row.keyword, 'bmi calculator');
  assert.equal(row.volume, 450000);
  assert.equal(row.cpc, 1.23);
  assert.equal(row.competition, 0.34);
  assert.equal(row.score, Math.round(450000 * 1.23 * (1 - 0.34)));
});

test('buildRow falls back to abbreviated headers (Nq, Cp, Co)', () => {
  const semrush = { phrase: [{ Ph: 'mortgage', Nq: '90500', Cp: '3.40', Co: '0.90' }], related: [] };
  const row = buildRow('mortgage', semrush);
  assert.equal(row.volume, 90500);
  assert.equal(row.cpc, 3.4);
  assert.equal(row.competition, 0.9);
});

test('buildRow returns a zero row when phrase data is empty (no coverage)', () => {
  const row = buildRow('obscure keyword', { phrase: [], related: [] });
  assert.equal(row.keyword, 'obscure keyword');
  assert.equal(row.volume, 0);
  assert.equal(row.cpc, 0);
  assert.equal(row.competition, null);
  assert.equal(row.score, 0);
  assert.equal(row.noData, true);
});

test('buildPrioritiesMarkdown sorts by score descending and formats a table', () => {
  const rows = [
    { keyword: 'low', volume: 100, cpc: 0.1, competition: 0.5, score: 5 },
    { keyword: 'high', volume: 10000, cpc: 2, competition: 0.2, score: 16000 },
    { keyword: 'mid', volume: 5000, cpc: 1, competition: 0.3, score: 3500 },
  ];
  const md = buildPrioritiesMarkdown(rows);
  assert.match(md, /# Calculator priority ranking/);
  // Sort order: high > mid > low
  const highIdx = md.indexOf('high');
  const midIdx = md.indexOf('mid');
  const lowIdx = md.indexOf('low');
  assert.ok(highIdx < midIdx && midIdx < lowIdx, 'rows not sorted by score desc');
  // Has a markdown table header
  assert.match(md, /\| Keyword \| Volume \| CPC \| Competition \| Score \|/);
});

test('buildPrioritiesMarkdown flags no-data rows in a separate section', () => {
  const rows = [
    { keyword: 'has-data', volume: 1000, cpc: 1, competition: 0.2, score: 800 },
    { keyword: 'no-data', volume: 0, cpc: 0, competition: null, score: 0, noData: true },
  ];
  const md = buildPrioritiesMarkdown(rows);
  assert.match(md, /## No SEMrush data/);
  assert.match(md, /no-data/);
  // The main table should only contain has-data
  const mainTable = md.split('## No SEMrush data')[0];
  assert.ok(mainTable.includes('has-data'));
  assert.ok(!mainTable.includes('no-data'));
});
