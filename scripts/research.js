const fs = require('node:fs');
const path = require('node:path');

const STYLE_RULES = [
  'STYLE RULES — apply to all output:',
  '- Use British English spelling throughout',
  '- Never use em dashes (—). Use a comma, colon, or rewrite the sentence.',
  '- Use plain, direct language. No marketing fluff.',
].join('\n');

function slugify(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, 'utf8');
  const env = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    env[key] = value;
  }
  return env;
}

function parseSemrushCsv(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return [];
  if (/^ERROR\s/i.test(trimmed)) return [];
  const lines = trimmed.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(';').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = line.split(';');
    const row = {};
    headers.forEach((h, i) => {
      row[h] = (cols[i] || '').trim();
    });
    return row;
  });
}

function isCacheFresh(filePath, maxAgeDays) {
  try {
    const stat = fs.statSync(filePath);
    const ageMs = Date.now() - stat.mtimeMs;
    return ageMs < maxAgeDays * 24 * 60 * 60 * 1000;
  } catch (_) {
    return false;
  }
}

async function fetchSerpapi(keyword, env, fetcher = fetch) {
  if (!env.SERPAPI_API_KEY) {
    throw new Error('SERPAPI_API_KEY not set in environment');
  }
  const params = new URLSearchParams({
    q: keyword,
    api_key: env.SERPAPI_API_KEY,
    engine: 'google',
    location: env.SERPAPI_LOCATION || 'United States',
    gl: env.SERPAPI_GL || 'us',
    hl: env.SERPAPI_HL || 'en',
    num: '10',
  });
  const url = `https://serpapi.com/search.json?${params.toString()}`;
  const res = await fetcher(url);
  if (!res.ok) {
    throw new Error(`SerpAPI request failed: ${res.status || 'unknown'}`);
  }
  const body = await res.json();
  return {
    organic_results: (body.organic_results || []).slice(0, 10).map((r) => ({
      position: r.position,
      title: r.title,
      link: r.link,
      snippet: r.snippet,
      displayed_link: r.displayed_link,
    })),
    related_questions: (body.related_questions || []).map((q) => ({
      question: q.question,
      snippet: q.snippet,
      link: q.link,
    })),
    related_searches: (body.related_searches || []).map((r) => ({ query: r.query })),
    featured_snippet: body.answer_box || body.featured_snippet || null,
    search_information: body.search_information || null,
  };
}

async function fetchSemrush(keyword, env, fetcher = fetch) {
  if (!env.SEMRUSH_API_KEY) {
    throw new Error('SEMRUSH_API_KEY not set in environment');
  }
  const database = env.SEMRUSH_DATABASE || 'us';
  const baseParams = {
    key: env.SEMRUSH_API_KEY,
    phrase: keyword,
    database,
    export_columns: 'Ph,Nq,Cp,Co,Nr,Td',
    display_limit: '10',
  };
  const phraseUrl =
    'https://api.semrush.com/?' +
    new URLSearchParams({ ...baseParams, type: 'phrase_this' }).toString();
  const relatedUrl =
    'https://api.semrush.com/?' +
    new URLSearchParams({ ...baseParams, type: 'phrase_related' }).toString();

  const [phraseRes, relatedRes] = await Promise.all([
    fetcher(phraseUrl),
    fetcher(relatedUrl),
  ]);
  const phraseText = phraseRes.ok ? await phraseRes.text() : '';
  const relatedText = relatedRes.ok ? await relatedRes.text() : '';
  return {
    phrase: parseSemrushCsv(phraseText),
    related: parseSemrushCsv(relatedText),
  };
}

async function synthesizeBrief(data, toneGuide, env, fetcher = fetch) {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not set in environment');
  }
  const model = env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
  const system = [
    'You are a senior SEO strategist and content planner writing a research brief.',
    '',
    'IMPORTANT MARKET CONTEXT:',
    '- Primary target market: United States. All traffic, volume, and competitor analysis should assume a US audience.',
    '- Currency figures should be in USD unless the raw data is explicitly in another currency.',
    '- Voice and spelling: British (see tone guide below). The brand voice is deliberately British for an American audience: it is a differentiator, not a targeting mistake. Do not suggest writing for a UK audience.',
    '',
    'Follow the voice guide below when writing prose in the brief:',
    '',
    toneGuide,
    '',
    STYLE_RULES,
  ].join('\n');
  const userPrompt = [
    `Produce a strategic research brief in markdown for the target keyword: "${data.keyword}".`,
    '',
    'Structure the brief as:',
    '1. Executive summary (2-3 sentences): search intent and opportunity.',
    '2. Keyword metrics: volume, CPC, competition (cite numbers).',
    '3. SERP landscape: what kinds of sites rank, any patterns or gaps.',
    '4. People Also Ask: group PAA questions into themes, suggest H2 candidates.',
    '5. Related searches and semantic keywords worth covering.',
    '6. Suggested page outline (h1, h2 list, key sections).',
    '7. FAQ schema content: 3-6 questions with concise answers drawn from PAA.',
    '8. Competitor gaps or differentiators we could exploit.',
    '',
    'Raw research data follows as JSON:',
    '',
    '```json',
    JSON.stringify(data, null, 2),
    '```',
  ].join('\n');

  const res = await fetcher('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4000,
      system,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });
  if (!res.ok) {
    const detail = res.text ? await res.text() : '';
    throw new Error(`Anthropic request failed: ${res.status || 'unknown'} ${detail}`);
  }
  const body = await res.json();
  const text = (body.content || [])
    .filter((c) => c.type === 'text')
    .map((c) => c.text)
    .join('\n');
  return text || '# Synthesis failed (empty response)';
}

function buildBasicBrief(data) {
  const lines = [];
  lines.push(`# Research brief: ${data.keyword}`);
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString().split('T')[0]}`);
  lines.push('');

  const phrase = (data.semrush && data.semrush.phrase && data.semrush.phrase[0]) || null;
  lines.push('## Keyword metrics (SEMrush)');
  lines.push('');
  if (phrase) {
    const volume = phrase['Search Volume'] || phrase.Nq || 'unknown';
    const cpc = phrase.CPC || phrase.Cp || 'unknown';
    const comp = phrase.Competition || phrase.Co || 'unknown';
    lines.push(`- Volume: ${volume}`);
    lines.push(`- CPC: ${cpc}`);
    lines.push(`- Competition: ${comp}`);
  } else {
    lines.push('- No SEMrush data returned.');
  }
  lines.push('');

  const organic = (data.serpapi && data.serpapi.organic_results) || [];
  lines.push('## Top 10 organic results');
  lines.push('');
  if (organic.length) {
    for (const r of organic) {
      lines.push(`${r.position}. [${r.title}](${r.link})`);
      if (r.snippet) lines.push(`   ${r.snippet}`);
    }
  } else {
    lines.push('- No organic results.');
  }
  lines.push('');

  const paa = (data.serpapi && data.serpapi.related_questions) || [];
  lines.push('## People also ask');
  lines.push('');
  if (paa.length) {
    for (const q of paa) {
      lines.push(`- **${q.question}**`);
      if (q.snippet) lines.push(`  ${q.snippet}`);
    }
  } else {
    lines.push('- No PAA returned.');
  }
  lines.push('');

  const related = (data.serpapi && data.serpapi.related_searches) || [];
  lines.push('## Related searches');
  lines.push('');
  if (related.length) {
    for (const r of related) lines.push(`- ${r.query}`);
  } else {
    lines.push('- None.');
  }
  lines.push('');

  const semRelated = (data.semrush && data.semrush.related) || [];
  lines.push('## Related keywords (SEMrush)');
  lines.push('');
  if (semRelated.length) {
    for (const r of semRelated) {
      const vol = r['Search Volume'] || r.Nq || '';
      lines.push(`- ${r.Keyword || r.Ph}${vol ? ` (vol: ${vol})` : ''}`);
    }
  } else {
    lines.push('- None.');
  }
  lines.push('');

  return lines.join('\n');
}

async function research(keyword, opts = {}) {
  const {
    env = loadEnv(path.join(__dirname, '..', '.env')),
    outDir = path.join(__dirname, '..', env.RESEARCH_DIR || 'research'),
    force = false,
    synthesize = false,
    toneGuidePath = path.join(__dirname, '..', 'tone.md'),
    fetcher = fetch,
    log = console.log,
  } = opts;

  const slug = slugify(keyword);
  fs.mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, `${slug}.json`);
  const mdPath = path.join(outDir, `${slug}.md`);
  const cacheDays = parseInt(env.RESEARCH_CACHE_DAYS || '30', 10);

  let data;
  if (!force && isCacheFresh(jsonPath, cacheDays)) {
    log(`Using cached research: ${jsonPath}`);
    data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  } else {
    log(`Fetching SerpAPI + SEMrush for "${keyword}"...`);
    const [serpapi, semrush] = await Promise.all([
      fetchSerpapi(keyword, env, fetcher),
      fetchSemrush(keyword, env, fetcher),
    ]);
    data = { keyword, fetched_at: new Date().toISOString(), serpapi, semrush };
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
    log(`Wrote ${jsonPath}`);
  }

  let brief = buildBasicBrief(data);
  if (synthesize) {
    log('Synthesising brief via Anthropic...');
    const toneGuide = fs.existsSync(toneGuidePath)
      ? fs.readFileSync(toneGuidePath, 'utf8')
      : '';
    brief = await synthesizeBrief(data, toneGuide, env, fetcher);
  }
  fs.writeFileSync(mdPath, brief);
  log(`Wrote ${mdPath}`);
  return { data, briefPath: mdPath, jsonPath };
}

module.exports = {
  slugify,
  loadEnv,
  parseSemrushCsv,
  isCacheFresh,
  buildBasicBrief,
  fetchSerpapi,
  fetchSemrush,
  synthesizeBrief,
  research,
  STYLE_RULES,
};

if (require.main === module) {
  const args = process.argv.slice(2);
  if (!args.length || args[0].startsWith('--')) {
    console.error('Usage: node scripts/research.js "keyword phrase" [--force] [--synthesize]');
    process.exit(1);
  }
  const keyword = args.filter((a) => !a.startsWith('--')).join(' ');
  const force = args.includes('--force');
  const synthesize = args.includes('--synthesize') || args.includes('--synthesise');
  research(keyword, { force, synthesize }).catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
