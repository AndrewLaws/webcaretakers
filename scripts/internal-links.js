const fs = require('node:fs');
const path = require('node:path');
const { parse } = require('node-html-parser');

const EXCLUDED_TAGS = new Set([
  'a', 'nav', 'header', 'footer', 'script', 'style', 'head',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'code', 'pre', 'noscript'
]);

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isInsideExcluded(node) {
  let cur = node.parentNode;
  while (cur && cur.tagName) {
    if (EXCLUDED_TAGS.has(cur.tagName.toLowerCase())) return true;
    cur = cur.parentNode;
  }
  return false;
}

function collectTextNodes(root) {
  const out = [];
  function walk(node) {
    if (!node) return;
    if (node.nodeType === 3) {
      if (node.rawText && node.rawText.trim() && !isInsideExcluded(node)) {
        out.push(node);
      }
      return;
    }
    const children = node.childNodes || [];
    for (const child of children) walk(child);
  }
  walk(root);
  return out;
}

function applyLinksToHtml(html, opts) {
  const { config, currentUrl = '/' } = opts;
  const excluded = new Set(config.excludeFromLinking || []);
  const inserted = [];

  if (excluded.has(currentUrl)) {
    return { html, inserted };
  }

  // Longest phrase first so "Broadband Bandwidth Calculator" beats "bandwidth calculator"
  const links = [...config.links].sort((a, b) => b.phrase.length - a.phrase.length);

  const root = parse(html, { comment: true });
  const usedUrls = new Set();

  for (const link of links) {
    if (link.url === currentUrl) continue;
    if (usedUrls.has(link.url)) continue;

    const re = new RegExp(`\\b(${escapeRegex(link.phrase)})\\b`, 'i');
    const textNodes = collectTextNodes(root);

    for (const tn of textNodes) {
      const text = tn.rawText;
      const m = text.match(re);
      if (!m) continue;

      const idx = m.index;
      const matched = m[0];
      const before = text.slice(0, idx);
      const after = text.slice(idx + matched.length);

      const fragHtml =
        escapeHtml(before) +
        `<a href="${link.url}">${escapeHtml(matched)}</a>` +
        escapeHtml(after);

      const wrapper = parse(`<span>${fragHtml}</span>`, { comment: true }).firstChild;
      const newNodes = wrapper.childNodes.slice();

      const parent = tn.parentNode;
      const parentChildren = parent.childNodes;
      const i = parentChildren.indexOf(tn);
      parentChildren.splice(i, 1, ...newNodes);
      for (const n of newNodes) { n.parentNode = parent; }

      inserted.push({ phrase: link.phrase, url: link.url, matched });
      usedUrls.add(link.url);
      break;
    }
  }

  return { html: root.toString(), inserted };
}

function urlFromFilePath(siteRoot, filePath) {
  const rel = path.relative(siteRoot, filePath).replace(/\\/g, '/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return '/' + rel.slice(0, -'index.html'.length);
  return '/' + rel;
}

function walkHtmlFiles(dir) {
  const out = [];
  function recur(d) {
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) recur(full);
      else if (e.isFile() && e.name.endsWith('.html')) out.push(full);
    }
  }
  recur(dir);
  return out;
}

function applyLinksToDir(siteRoot, configPath, opts = {}) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const files = walkHtmlFiles(siteRoot);
  const report = [];
  let changed = 0;

  for (const file of files) {
    const original = fs.readFileSync(file, 'utf8');
    const currentUrl = urlFromFilePath(siteRoot, file);
    const { html, inserted } = applyLinksToHtml(original, { config, currentUrl });
    if (inserted.length > 0 && html !== original) {
      fs.writeFileSync(file, html);
      changed += 1;
      report.push({ file: path.relative(process.cwd(), file), currentUrl, inserted });
    }
  }

  if (opts.log !== false) {
    const logFn = opts.log || console.log;
    if (changed === 0) {
      logFn('Internal links: nothing to add.');
    } else {
      logFn(`Internal links: updated ${changed} file(s).`);
      for (const r of report) {
        for (const ins of r.inserted) {
          logFn(`  ${r.file}: "${ins.matched}" -> ${ins.url}`);
        }
      }
    }
  }

  return { changed, report };
}

module.exports = {
  applyLinksToHtml,
  applyLinksToDir,
  urlFromFilePath,
  walkHtmlFiles,
};

if (require.main === module) {
  const siteRoot = path.join(__dirname, '..', 'site');
  const configPath = path.join(__dirname, '..', 'links.json');
  applyLinksToDir(siteRoot, configPath);
}
