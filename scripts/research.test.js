const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {
  slugify,
  loadEnv,
  parseSemrushCsv,
  isCacheFresh,
  buildBasicBrief,
  fetchSerpapi,
  fetchSemrush,
  synthesizeBrief,
} = require('./research');

test('slugify lowercases, replaces spaces, and strips punctuation', () => {
  assert.equal(slugify('Broadband Bandwidth Calculator'), 'broadband-bandwidth-calculator');
  assert.equal(slugify('What is SEO?'), 'what-is-seo');
  assert.equal(slugify('  multiple   spaces  '), 'multiple-spaces');
  assert.equal(slugify('already-slugged'), 'already-slugged');
});

test('loadEnv parses KEY=value lines, ignores comments and blanks', () => {
  const tmp = path.join(os.tmpdir(), `wc-env-${Date.now()}.env`);
  fs.writeFileSync(
    tmp,
    [
      '# a comment',
      '',
      'FOO=bar',
      'BAZ = qux  ',
      '# another',
      'EMPTY=',
      'WITH_EQUALS=a=b=c',
    ].join('\n'),
  );
  const env = loadEnv(tmp);
  assert.equal(env.FOO, 'bar');
  assert.equal(env.BAZ, 'qux');
  assert.equal(env.EMPTY, '');
  assert.equal(env.WITH_EQUALS, 'a=b=c');
  assert.equal(env['# a comment'], undefined);
});

test('parseSemrushCsv parses semicolon CSV with header row', () => {
  const csv = 'Keyword;Search Volume;CPC;Competition\nbroadband calculator;1900;1.45;0.35\nbandwidth calc;880;0.92;0.21';
  const rows = parseSemrushCsv(csv);
  assert.equal(rows.length, 2);
  assert.equal(rows[0]['Keyword'], 'broadband calculator');
  assert.equal(rows[0]['Search Volume'], '1900');
  assert.equal(rows[1]['CPC'], '0.92');
});

test('parseSemrushCsv returns empty array when response is empty or error', () => {
  assert.deepEqual(parseSemrushCsv(''), []);
  assert.deepEqual(parseSemrushCsv('ERROR 50 :: NOTHING FOUND'), []);
});

test('isCacheFresh returns false when file does not exist', () => {
  assert.equal(isCacheFresh('/nonexistent/path.json', 30), false);
});

test('isCacheFresh returns true for a just-created file, false for ancient one', () => {
  const fresh = path.join(os.tmpdir(), `wc-fresh-${Date.now()}.json`);
  fs.writeFileSync(fresh, '{}');
  assert.equal(isCacheFresh(fresh, 30), true);

  const old = path.join(os.tmpdir(), `wc-old-${Date.now()}.json`);
  fs.writeFileSync(old, '{}');
  const ancient = Date.now() / 1000 - 60 * 60 * 24 * 60;
  fs.utimesSync(old, ancient, ancient);
  assert.equal(isCacheFresh(old, 30), false);
});

test('buildBasicBrief produces markdown with keyword, volume, PAA, related searches', () => {
  const data = {
    keyword: 'broadband bandwidth calculator',
    serpapi: {
      organic_results: [
        { position: 1, title: 'Top Result', link: 'https://example.com/a', snippet: 'A snippet' },
      ],
      related_questions: [
        { question: 'How much bandwidth do I need?', snippet: 'It depends.' },
      ],
      related_searches: [{ query: 'bandwidth calculator' }],
      featured_snippet: null,
    },
    semrush: {
      phrase: [{ Keyword: 'broadband bandwidth calculator', 'Search Volume': '1900', CPC: '1.45' }],
      related: [{ Keyword: 'bandwidth calculator', 'Search Volume': '1200' }],
    },
  };
  const md = buildBasicBrief(data);
  assert.ok(md.includes('broadband bandwidth calculator'));
  assert.ok(md.includes('1900'));
  assert.ok(md.includes('How much bandwidth do I need?'));
  assert.ok(md.includes('bandwidth calculator'));
  assert.ok(md.includes('Top Result'));
});

test('fetchSerpapi calls correct URL and normalises response', async () => {
  let called;
  const mockFetcher = async (url) => {
    called = url;
    return {
      ok: true,
      json: async () => ({
        organic_results: [{ position: 1, title: 'X', link: 'https://x', snippet: 's' }],
        related_questions: [{ question: 'Q?', snippet: 'A.' }],
        related_searches: [{ query: 'r' }],
      }),
    };
  };
  const env = {
    SERPAPI_API_KEY: 'serp-key',
    SERPAPI_LOCATION: 'United States',
    SERPAPI_GL: 'us',
    SERPAPI_HL: 'en',
  };
  const result = await fetchSerpapi('broadband calculator', env, mockFetcher);
  assert.ok(called.startsWith('https://serpapi.com/search.json'));
  assert.ok(called.includes('q=broadband+calculator') || called.includes('q=broadband%20calculator'));
  assert.ok(called.includes('api_key=serp-key'));
  assert.ok(called.includes('gl=us'));
  assert.equal(result.organic_results.length, 1);
  assert.equal(result.related_questions[0].question, 'Q?');
});

test('fetchSerpapi throws a helpful error when API key is missing', async () => {
  await assert.rejects(
    () => fetchSerpapi('x', {}, async () => ({})),
    /SERPAPI_API_KEY/,
  );
});

test('fetchSemrush calls phrase_this and phrase_related endpoints and returns parsed rows', async () => {
  const calls = [];
  const mockFetcher = async (url) => {
    calls.push(url);
    if (url.includes('type=phrase_this')) {
      return {
        ok: true,
        text: async () => 'Keyword;Search Volume;CPC\nbroadband;1900;1.45',
      };
    }
    if (url.includes('type=phrase_related')) {
      return {
        ok: true,
        text: async () => 'Keyword;Search Volume\nwifi speed;800',
      };
    }
    return { ok: false, text: async () => '' };
  };
  const env = { SEMRUSH_API_KEY: 'sem-key', SEMRUSH_DATABASE: 'us' };
  const result = await fetchSemrush('broadband', env, mockFetcher);
  assert.equal(calls.length, 2);
  assert.ok(calls[0].includes('key=sem-key'));
  assert.ok(calls[0].includes('database=us'));
  assert.equal(result.phrase[0]['Search Volume'], '1900');
  assert.equal(result.related[0].Keyword, 'wifi speed');
});

test('fetchSemrush throws when API key is missing', async () => {
  await assert.rejects(
    () => fetchSemrush('x', {}, async () => ({})),
    /SEMRUSH_API_KEY/,
  );
});

test('synthesizeBrief sends tone rules and raw data to Anthropic and returns markdown', async () => {
  let sentBody;
  const mockFetcher = async (url, opts) => {
    sentBody = JSON.parse(opts.body);
    return {
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: '# Synthesised brief\n\nLooks good.' }],
      }),
    };
  };
  const env = {
    ANTHROPIC_API_KEY: 'anthropic-key',
    ANTHROPIC_MODEL: 'claude-sonnet-4-6',
  };
  const data = { keyword: 'x', serpapi: {}, semrush: {} };
  const toneGuide = '# Tone\nBe British.';
  const md = await synthesizeBrief(data, toneGuide, env, mockFetcher);
  assert.ok(md.includes('Synthesised brief'));
  assert.equal(sentBody.model, 'claude-sonnet-4-6');
  const systemText = JSON.stringify(sentBody);
  assert.ok(systemText.includes('Be British'));
  assert.ok(systemText.includes('British English'));
  assert.ok(systemText.includes('Never use em dashes'));
});

test('synthesizeBrief throws when ANTHROPIC_API_KEY is missing', async () => {
  await assert.rejects(
    () => synthesizeBrief({}, '', {}, async () => ({})),
    /ANTHROPIC_API_KEY/,
  );
});
