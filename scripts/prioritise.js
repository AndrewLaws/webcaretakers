// Batch calculator prioritisation. Reads a candidate keyword list, pulls
// SEMrush phrase metrics for each (reusing the research.js cache), scores by
// volume * CPC * (1 - competition), and writes a sorted markdown table so we
// can pick the next calculators on evidence rather than hunch.

const fs = require('node:fs');
const path = require('node:path');

const { fetchSemrush, loadEnv, slugify, isCacheFresh } = require('./research');

function parseCandidates(raw) {
  return String(raw || '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  const n = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function toCompetition(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function scoreRow({ volume, cpc, competition }) {
  if (!volume || !cpc) return 0;
  const comp = competition == null ? 0 : competition;
  return Math.round(volume * cpc * (1 - comp));
}

function buildRow(keyword, semrush) {
  const first = (semrush && semrush.phrase && semrush.phrase[0]) || null;
  if (!first) {
    return {
      keyword, volume: 0, cpc: 0, competition: null, score: 0, noData: true,
    };
  }
  const volume = toNumber(first['Search Volume'] || first.Nq);
  const cpc = toNumber(first.CPC || first.Cp);
  const competition = toCompetition(first.Competition || first.Co);
  const row = { keyword, volume, cpc, competition };
  row.score = scoreRow(row);
  return row;
}

function fmtNumber(n) {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-GB');
}

function fmtCpc(n) {
  if (!Number.isFinite(n) || n === 0) return '—';
  return '$' + n.toFixed(2);
}

function fmtComp(n) {
  if (n === null || n === undefined) return '—';
  return n.toFixed(2);
}

function buildPrioritiesMarkdown(rows) {
  const scored = rows.filter((r) => !r.noData).sort((a, b) => b.score - a.score);
  const missing = rows.filter((r) => r.noData);

  const lines = [];
  lines.push('# Calculator priority ranking');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString().split('T')[0]}`);
  lines.push('');
  lines.push('Score = volume × CPC × (1 − competition). It is a crude rev-opportunity heuristic, not a forecast. Use it to sort, then apply judgement (build effort, affiliate fit, brand fit).');
  lines.push('');
  lines.push('| Keyword | Volume | CPC | Competition | Score |');
  lines.push('| --- | ---: | ---: | ---: | ---: |');
  for (const r of scored) {
    lines.push(`| ${r.keyword} | ${fmtNumber(r.volume)} | ${fmtCpc(r.cpc)} | ${fmtComp(r.competition)} | ${fmtNumber(r.score)} |`);
  }
  lines.push('');

  if (missing.length) {
    lines.push('## No SEMrush data');
    lines.push('');
    lines.push('These keywords returned no phrase data. May be too niche, misspelled, or outside the configured database.');
    lines.push('');
    for (const r of missing) lines.push(`- ${r.keyword}`);
    lines.push('');
  }
  return lines.join('\n');
}

async function prioritise(opts = {}) {
  const {
    env = loadEnv(path.join(__dirname, '..', '.env')),
    candidatesPath = path.join(__dirname, '..', 'research', 'candidates.txt'),
    outDir = path.join(__dirname, '..', env.RESEARCH_DIR || 'research'),
    force = false,
    fetcher = fetch,
    log = console.log,
  } = opts;

  if (!fs.existsSync(candidatesPath)) {
    throw new Error(`Candidates file not found: ${candidatesPath}`);
  }
  const keywords = parseCandidates(fs.readFileSync(candidatesPath, 'utf8'));
  if (!keywords.length) throw new Error('No candidates to score.');

  fs.mkdirSync(outDir, { recursive: true });
  const cacheDays = parseInt(env.RESEARCH_CACHE_DAYS || '30', 10);
  const rows = [];

  for (const keyword of keywords) {
    const slug = slugify(keyword);
    const cachePath = path.join(outDir, `_semrush-${slug}.json`);
    let semrush;
    if (!force && isCacheFresh(cachePath, cacheDays)) {
      log(`  cached: ${keyword}`);
      semrush = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    } else {
      log(`  fetch : ${keyword}`);
      try {
        semrush = await fetchSemrush(keyword, env, fetcher);
        fs.writeFileSync(cachePath, JSON.stringify(semrush, null, 2));
      } catch (err) {
        log(`  ! SEMrush failed for "${keyword}": ${err.message}`);
        semrush = { phrase: [], related: [] };
      }
    }
    rows.push(buildRow(keyword, semrush));
  }

  const md = buildPrioritiesMarkdown(rows);
  const outPath = path.join(outDir, '_priorities.md');
  fs.writeFileSync(outPath, md);
  log(`Wrote ${outPath}`);
  return { rows, outPath };
}

module.exports = {
  parseCandidates,
  scoreRow,
  buildRow,
  buildPrioritiesMarkdown,
  prioritise,
};

if (require.main === module) {
  const force = process.argv.includes('--force');
  prioritise({ force }).catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
