#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function readJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; }
}

function gzipSizeSync(buf) {
  const zlib = require('zlib');
  return zlib.gzipSync(Buffer.isBuffer(buf) ? buf : Buffer.from(buf)).length;
}

function main() {
  const nextDir = path.join(__dirname, '..', '.next');
  const budgets = readJson(path.join(__dirname, '..', 'BUNDLE_BUDGETS.json'), {});
  const traceDir = path.join(nextDir, 'server/next-font-manifest.json');
  const buildIdPath = path.join(nextDir, 'BUILD_ID');
  const buildId = fs.existsSync(buildIdPath) ? fs.readFileSync(buildIdPath, 'utf8').trim() : 'dev';
  const pagesDir = path.join(nextDir, 'server', 'app');
  const out = { ok: true, details: [] };
  function push(page, size) {
    const lim = budgets.pages?.[page]?.gzipKB || 0;
    const ok = lim > 0 ? size <= lim * 1024 : true;
    out.details.push({ page, gzipBytes: size, limitBytes: lim * 1024, ok });
    if (!ok) out.ok = false;
  }
  if (fs.existsSync(pagesDir)) {
    const walk = (dir, prefix = '') => {
      for (const f of fs.readdirSync(dir)) {
        const p = path.join(dir, f);
        const rel = path.join(prefix, f);
        const stat = fs.statSync(p);
        if (stat.isDirectory()) walk(p, rel);
        else if (f === 'index.html' || f.endsWith('.rsc')) {
          const page = '/' + rel.replace(/\\/g, '/').replace(/\/index\.html$/, '').replace(/\/page\.rsc$/, '');
          const buf = fs.readFileSync(p);
          const gz = gzipSizeSync(buf);
          push(page, gz);
        }
      }
    };
    walk(pagesDir);
  }
  // Shared vendor not trivial to compute in app dir; leave placeholder
  fs.writeFileSync(path.join(__dirname, '..', 'bundle-stats.json'), JSON.stringify(out, null, 2));
  if (!out.ok) {
    console.error('Bundle budgets exceeded');
    process.exit(1);
  }
  console.log('Bundle budgets OK');
}

main();
