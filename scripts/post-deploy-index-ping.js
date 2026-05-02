#!/usr/bin/env node
// Post-deploy indexing pusher.
//
// After a deploy, diff the current sitemap against the previous run's snapshot
// to find newly added URLs, then notify Bing/Yandex/Seznam via IndexNow so
// crawl latency on new calculators is closer to "minutes" than "weeks".
//
// What this script does:
//   - Walks every site/sitemap-*.xml file, collecting all canonical URLs
//   - Diffs against .indexnow-snapshot.json (created on first run)
//   - POSTs added URLs (chunked at 10k per request, the IndexNow limit) to
//     https://api.indexnow.org/IndexNow
//   - Logs each submission with a timestamp to .indexnow-log.jsonl
//   - Updates the snapshot for next run
//
// What this script intentionally does NOT do, and never will:
//   - Google Indexing API. Officially restricted to JobPosting and
//     BroadcastEvent schemas. Calculator pages do not qualify, so submitting
//     them is a policy violation that risks the GSC property. Manual URL
//     Inspection in GSC (capped ~10/day, fully sanctioned) is the right path
//     for Google when a specific page needs faster crawl.
//   - GSC sitemap submission via API. The one-off submission of sitemap.xml
//     in the Search Console UI is enough; an automated re-submit adds nothing
//     because Google re-fetches the index on its own crawl cadence.
//   - The deprecated google.com/ping?sitemap=... endpoint.
//   - Any runtime browser fetches.
//
// Usage:
//   INDEXNOW_KEY=... node scripts/post-deploy-index-ping.js [flags]
//
// Flags:
//   --dry-run           Show what would be sent without making any HTTP calls
//   --initial-publish   On first run (no snapshot), ping all URLs anyway. By
//                       default the first run only writes the baseline snapshot
//                       to avoid spamming IndexNow with the entire catalogue.
//   --site-dir <path>   Override the site directory (default: ./site)
//
// Required environment:
//   INDEXNOW_KEY  An 8-128 char alphanumeric/hex key. The script also expects a
//                 file at site/<INDEXNOW_KEY>.txt containing just that key, so
//                 IndexNow can verify domain ownership. Generate one with:
//                   node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"

const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const DEFAULT_SITE_DIR = path.join(REPO_ROOT, 'site');
const SNAPSHOT_PATH = path.join(REPO_ROOT, '.indexnow-snapshot.json');
const LOG_PATH = path.join(REPO_ROOT, '.indexnow-log.jsonl');
const HOST = 'webcaretakers.com';
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/IndexNow';
const INDEXNOW_BATCH_LIMIT = 10000;

// ----- Pure functions (unit-tested) -----

function parseSitemapIndex(xml) {
  if (!xml) return [];
  const out = [];
  const re = /<sitemap>[\s\S]*?<loc>\s*([^<\s][^<]*?)\s*<\/loc>/g;
  let m;
  while ((m = re.exec(xml)) !== null) out.push(m[1].trim());
  return out;
}

function parseUrlSet(xml) {
  if (!xml) return [];
  const out = [];
  const re = /<url>[\s\S]*?<loc>\s*([^<\s][^<]*?)\s*<\/loc>/g;
  let m;
  while ((m = re.exec(xml)) !== null) out.push(m[1].trim());
  return out;
}

function diffUrls(prev, next) {
  const prevSet = new Set(prev);
  const nextSet = new Set(next);
  const added = next.filter((u) => !prevSet.has(u));
  const removed = prev.filter((u) => !nextSet.has(u));
  return { added, removed };
}

function buildPayload({ host, key, keyLocation, urlList }) {
  return { host, key, keyLocation, urlList };
}

function chunkUrls(urls, size = INDEXNOW_BATCH_LIMIT) {
  const out = [];
  for (let i = 0; i < urls.length; i += size) {
    out.push(urls.slice(i, i + size));
  }
  return out;
}

// ----- Side-effect helpers -----

function readEnvKey() {
  if (process.env.INDEXNOW_KEY) return process.env.INDEXNOW_KEY.trim();
  // Allow .env so local manual runs work without exporting the var
  const envFile = path.join(REPO_ROOT, '.env');
  if (fs.existsSync(envFile)) {
    const txt = fs.readFileSync(envFile, 'utf8');
    const m = txt.match(/^INDEXNOW_KEY\s*=\s*(.+)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  }
  return null;
}

function loadAllUrls(siteDir) {
  const urls = new Set();
  const indexPath = path.join(siteDir, 'sitemap.xml');
  if (!fs.existsSync(indexPath)) {
    throw new Error(`No sitemap.xml found at ${indexPath}`);
  }
  const indexXml = fs.readFileSync(indexPath, 'utf8');
  const childUrls = parseSitemapIndex(indexXml);
  if (childUrls.length === 0) {
    // Treat as flat urlset rather than an index
    parseUrlSet(indexXml).forEach((u) => urls.add(u));
    return [...urls].sort();
  }
  for (const childUrl of childUrls) {
    // childUrl is absolute (https://webcaretakers.com/sitemap-foo.xml)
    const fileName = path.basename(new URL(childUrl).pathname);
    const filePath = path.join(siteDir, fileName);
    if (!fs.existsSync(filePath)) {
      console.warn(`  warn: child sitemap not found locally: ${fileName}`);
      continue;
    }
    const xml = fs.readFileSync(filePath, 'utf8');
    parseUrlSet(xml).forEach((u) => urls.add(u));
  }
  return [...urls].sort();
}

function loadSnapshot() {
  if (!fs.existsSync(SNAPSHOT_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function saveSnapshot(urls) {
  fs.writeFileSync(
    SNAPSHOT_PATH,
    JSON.stringify({ savedAt: new Date().toISOString(), urls }, null, 2),
    'utf8'
  );
}

function appendLog(entry) {
  fs.appendFileSync(LOG_PATH, JSON.stringify(entry) + '\n', 'utf8');
}

async function postChunk(payload) {
  // Native fetch is available on Node 18+
  const res = await fetch(INDEXNOW_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  });
  // IndexNow returns 200 (ok), 202 (accepted), or 4xx for problems.
  return { status: res.status, ok: res.ok };
}

// ----- Main -----

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const initialPublish = args.includes('--initial-publish');
  const siteDirIdx = args.indexOf('--site-dir');
  const siteDir = siteDirIdx !== -1 ? args[siteDirIdx + 1] : DEFAULT_SITE_DIR;

  const key = readEnvKey();
  if (!key) {
    console.error('ERROR: INDEXNOW_KEY is not set in env or .env file.');
    console.error('Generate one with:');
    console.error("  node -e \"console.log(require('crypto').randomBytes(16).toString('hex'))\"");
    console.error('Then add `INDEXNOW_KEY=<key>` to .env and create site/<key>.txt with the key as its only contents.');
    process.exit(1);
  }

  const keyFile = path.join(siteDir, `${key}.txt`);
  if (!fs.existsSync(keyFile)) {
    console.error(`ERROR: Key verification file missing at ${keyFile}`);
    console.error(`Create it with: echo "${key}" > "${keyFile}"`);
    console.error('IndexNow fetches this URL to confirm you own the domain.');
    process.exit(1);
  }
  const keyFileContents = fs.readFileSync(keyFile, 'utf8').trim();
  if (keyFileContents !== key) {
    console.error(`ERROR: ${keyFile} does not contain the expected key.`);
    console.error(`Expected: ${key}`);
    console.error(`Found:    ${keyFileContents}`);
    process.exit(1);
  }

  const currentUrls = loadAllUrls(siteDir);
  console.log(`Loaded ${currentUrls.length} URLs from sitemaps under ${siteDir}.`);

  const snapshot = loadSnapshot();
  if (!snapshot) {
    if (initialPublish) {
      console.log('No snapshot, --initial-publish set: pinging all URLs.');
    } else {
      console.log('No snapshot found. Writing baseline and exiting without pinging.');
      console.log('(Re-run with --initial-publish to ping all URLs on first run.)');
      saveSnapshot(currentUrls);
      appendLog({
        ts: new Date().toISOString(),
        action: 'baseline',
        urlCount: currentUrls.length,
      });
      return;
    }
  }

  const prev = initialPublish && !snapshot ? [] : (snapshot ? snapshot.urls : []);
  const { added, removed } = diffUrls(prev, currentUrls);

  if (added.length === 0) {
    console.log('No new URLs to submit.');
    if (removed.length) console.log(`(${removed.length} URLs were removed since last run; not pinged.)`);
    appendLog({
      ts: new Date().toISOString(),
      action: 'noop',
      added: 0,
      removed: removed.length,
    });
    saveSnapshot(currentUrls);
    return;
  }

  console.log(`${added.length} new URL(s) to submit.`);
  if (removed.length) console.log(`(${removed.length} URLs were removed since last run; not pinged.)`);

  const keyLocation = `https://${HOST}/${key}.txt`;
  const chunks = chunkUrls(added, INDEXNOW_BATCH_LIMIT);

  if (dryRun) {
    console.log(`DRY RUN: would POST ${chunks.length} chunk(s) to ${INDEXNOW_ENDPOINT}`);
    chunks.forEach((c, i) => console.log(`  chunk ${i + 1}: ${c.length} URLs (first: ${c[0]})`));
    return;
  }

  const results = [];
  for (let i = 0; i < chunks.length; i++) {
    const payload = buildPayload({ host: HOST, key, keyLocation, urlList: chunks[i] });
    try {
      const result = await postChunk(payload);
      console.log(`  chunk ${i + 1}/${chunks.length}: status ${result.status}`);
      results.push(result);
    } catch (err) {
      console.error(`  chunk ${i + 1}/${chunks.length}: ${err.message}`);
      results.push({ status: 0, ok: false, error: err.message });
    }
  }

  appendLog({
    ts: new Date().toISOString(),
    action: 'submit',
    added: added.length,
    removed: removed.length,
    chunks: results,
    sampleUrls: added.slice(0, 5),
  });
  saveSnapshot(currentUrls);

  const allOk = results.every((r) => r.ok);
  if (!allOk) {
    console.error('One or more chunks failed; see log at .indexnow-log.jsonl');
    process.exit(2);
  }
  console.log('Done.');
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.stack || err.message);
    process.exit(1);
  });
}

module.exports = {
  parseSitemapIndex,
  parseUrlSet,
  diffUrls,
  buildPayload,
  chunkUrls,
};
