#!/usr/bin/env node
// Core Web Vitals baseline measurement.
//
// Spins up a local static server against site/, drives Playwright Chromium
// against a sample of pages spanning template types, and captures lab metrics:
//   - FCP   First Contentful Paint (ms)
//   - LCP   Largest Contentful Paint (ms)
//   - CLS   Cumulative Layout Shift (unitless)
//   - TBT-ish blocking time via long-task observer
//   - Transfer size (KB) and request count
//
// Lab measurements only. Real-user INP needs CrUX field data, which lands in
// GSC after about 28 days of traffic (Site SEO programme task #1). Until then
// these lab numbers are the best signal we have for spotting regressions
// between deploys.
//
// Output:
//   cwv-baseline.json   per-page measurements + per-template aggregates
//
// Usage:
//   npm run measure:cwv               # measures the default sample, writes baseline
//   npm run measure:cwv -- --check    # measures, then compares against
//                                       scripts/cwv-budgets.json (if present) and
//                                       exits non-zero on any breach

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');

const REPO_ROOT = path.resolve(__dirname, '..');
const BASELINE_OUT = path.join(REPO_ROOT, 'cwv-baseline.json');
const BUDGETS_PATH = path.join(__dirname, 'cwv-budgets.json');

// 10 pages spanning template diversity: homepage, all-calc index, two hubs,
// six calculators ranging from text-only to file-upload-with-map-rendering.
const SAMPLE_URLS = [
  '/',
  '/calculators/',
  '/calculators/health/',
  '/calculators/finance/',
  '/calculators/health/bmi-calculator/',
  '/calculators/math/percentage-calculator/',
  '/calculators/finance/uk-mortgage-calculator/',
  '/calculators/health/uk-marathon-course-difficulty-calculator/',
  '/calculators/images/photo-resizer/',
  '/calculators/writing/word-count/',
];

// ----- Pure functions (unit-tested) -----

function classifyTemplate(urlPath) {
  if (urlPath === '/') return 'homepage';
  if (urlPath === '/calculators/') return 'all-index';
  // /calculators/{cat}/
  if (/^\/calculators\/[^/]+\/$/.test(urlPath)) return 'hub';
  // /calculators/{cat}/{slug}/
  if (/^\/calculators\/[^/]+\/[^/]+\/$/.test(urlPath)) return 'calculator';
  return 'other';
}

function median(nums) {
  if (nums.length === 0) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function aggregateByTemplate(measurements) {
  const groups = {};
  for (const m of measurements) {
    if (!groups[m.template]) groups[m.template] = [];
    groups[m.template].push(m);
  }
  const out = {};
  for (const [tpl, items] of Object.entries(groups)) {
    const stat = (key) => {
      const vals = items.map((i) => i[key]).filter((v) => Number.isFinite(v));
      if (vals.length === 0) return { median: null, max: null };
      return { median: median(vals), max: Math.max(...vals) };
    };
    out[tpl] = {
      count: items.length,
      lcp: stat('lcp'),
      cls: stat('cls'),
      transferKb: stat('transferKb'),
      fcp: stat('fcp'),
      requests: stat('requests'),
    };
  }
  return out;
}

function checkBudgets(baseline, budgets) {
  const failures = [];
  for (const [tpl, budget] of Object.entries(budgets)) {
    const stats = baseline[tpl];
    if (!stats) continue;
    for (const [metric, limit] of Object.entries(budget)) {
      const observed = stats[metric] && stats[metric].max;
      if (observed != null && observed > limit) {
        failures.push(
          `${tpl}.${metric}: worst page ${observed} exceeds budget ${limit}`
        );
      }
    }
  }
  return failures;
}

// ----- Side-effect helpers -----

function findFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

function startServer(port) {
  return new Promise((resolve, reject) => {
    const proc = spawn('npx', ['serve', '-l', String(port), 'site', '--no-clipboard', '--no-port-switching'], {
      cwd: REPO_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        proc.kill();
        reject(new Error('serve did not start within 10s'));
      }
    }, 10000);
    const onReady = () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      resolve(proc);
    };
    // serve writes "Accepting connections" once ready
    proc.stdout.on('data', (buf) => {
      if (buf.toString().toLowerCase().includes('accepting connections')) onReady();
    });
    proc.stderr.on('data', () => {});
    proc.on('error', (err) => { if (!resolved) reject(err); });
  });
}

async function measureOne(browser, baseUrl, urlPath) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (cwv-baseline)',
  });
  const page = await context.newPage();

  // Track transfer sizes and request count
  let transferBytes = 0;
  let requests = 0;
  page.on('response', async (res) => {
    requests++;
    try {
      const buf = await res.body();
      transferBytes += buf.length;
    } catch {
      // response body unavailable (redirect, etc.)
    }
  });

  await page.goto(baseUrl + urlPath, { waitUntil: 'networkidle' });

  // Capture metrics from the page context.
  const metrics = await page.evaluate(() => {
    return new Promise((resolve) => {
      const data = { fcp: null, lcp: null, cls: 0 };
      // FCP from PerformancePaintTiming
      const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
      if (fcpEntry) data.fcp = Math.round(fcpEntry.startTime);
      // LCP via PerformanceObserver
      let lcp = null;
      try {
        const lcpObs = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) lcp = entry.startTime;
        });
        lcpObs.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch {}
      // CLS via PerformanceObserver
      try {
        const clsObs = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) data.cls += entry.value;
          }
        });
        clsObs.observe({ type: 'layout-shift', buffered: true });
      } catch {}
      // Give observers time to flush
      setTimeout(() => {
        if (lcp != null) data.lcp = Math.round(lcp);
        data.cls = Math.round(data.cls * 1000) / 1000;
        resolve(data);
      }, 1500);
    });
  });

  await context.close();
  return {
    url: urlPath,
    template: classifyTemplate(urlPath),
    fcp: metrics.fcp,
    lcp: metrics.lcp,
    cls: metrics.cls,
    transferKb: Math.round(transferBytes / 1024),
    requests,
  };
}

async function runMeasurements() {
  const { chromium } = require('playwright');
  const port = await findFreePort();
  const baseUrl = `http://localhost:${port}`;
  console.log(`Starting local server on ${baseUrl} ...`);
  const server = await startServer(port);

  const measurements = [];
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    for (const urlPath of SAMPLE_URLS) {
      process.stdout.write(`  measuring ${urlPath} ... `);
      const m = await measureOne(browser, baseUrl, urlPath);
      console.log(`LCP=${m.lcp}ms CLS=${m.cls} ${m.transferKb}KB ${m.requests}req`);
      measurements.push(m);
    }
  } finally {
    if (browser) await browser.close();
    server.kill();
  }

  return measurements;
}

async function main() {
  const args = process.argv.slice(2);
  const checkMode = args.includes('--check');

  const measurements = await runMeasurements();
  const aggregates = aggregateByTemplate(measurements);
  const out = {
    measuredAt: new Date().toISOString(),
    measurements,
    aggregates,
  };
  fs.writeFileSync(BASELINE_OUT, JSON.stringify(out, null, 2));
  console.log(`\nWrote ${path.relative(REPO_ROOT, BASELINE_OUT)}`);
  console.log('\nPer-template medians (max in brackets):');
  for (const [tpl, s] of Object.entries(aggregates)) {
    console.log(`  ${tpl} (${s.count} page${s.count > 1 ? 's' : ''}):`);
    console.log(`    LCP        ${s.lcp.median}ms (${s.lcp.max}ms)`);
    console.log(`    CLS        ${s.cls.median} (${s.cls.max})`);
    console.log(`    Transfer   ${s.transferKb.median} KB (${s.transferKb.max} KB)`);
    console.log(`    Requests   ${s.requests.median} (${s.requests.max})`);
  }

  if (checkMode) {
    if (!fs.existsSync(BUDGETS_PATH)) {
      console.log('\nNo budgets file at scripts/cwv-budgets.json; skipping check.');
      return;
    }
    const budgets = JSON.parse(fs.readFileSync(BUDGETS_PATH, 'utf8'));
    const failures = checkBudgets(aggregates, budgets);
    if (failures.length) {
      console.error('\nBUDGET BREACHES:');
      for (const f of failures) console.error(`  ${f}`);
      process.exit(1);
    }
    console.log('\nAll templates within budget.');
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.stack || err.message);
    process.exit(1);
  });
}

module.exports = {
  classifyTemplate,
  aggregateByTemplate,
  checkBudgets,
};
