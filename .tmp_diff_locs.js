const fs = require('fs');
const dir = __dirname + '/site';
const newLocs = new Set();
for (const f of fs.readdirSync(dir)) {
  if (f.startsWith('sitemap-') && f.endsWith('.xml')) {
    const c = fs.readFileSync(dir + '/' + f, 'utf8');
    for (const m of c.matchAll(/<loc>([^<]+)<\/loc>/g)) newLocs.add(m[1]);
  }
}
const { execSync } = require('child_process');
const old = execSync('git show HEAD:site/sitemap.xml', { cwd: __dirname }).toString();
const oldLocs = new Set([...old.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]));
console.log('only in new:', [...newLocs].filter(x => !oldLocs.has(x)));
console.log('only in old:', [...oldLocs].filter(x => !newLocs.has(x)));
console.log('new count:', newLocs.size, 'old count:', oldLocs.size);
