#!/usr/bin/env node
/**
 * End-to-end smoke test for a Wintergarten deployment.
 *
 *   node scripts/smoke-test.mjs https://wintergarten-git-dev-windrose.vercel.app
 *   node scripts/smoke-test.mjs https://www.derwintergarten.com
 *
 * Exits 0 if every check passes, 1 otherwise. No dependencies.
 */

const base = (process.argv[2] || '').replace(/\/$/, '');

if (!base) {
  console.error('usage: node scripts/smoke-test.mjs <deployment-url>');
  process.exit(1);
}

const results = [];
let failed = 0;

function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
  if (!ok) failed += 1;
}

async function get(path) {
  const started = Date.now();
  try {
    const res = await fetch(base + path, { redirect: 'follow' });
    const body = await res.text();
    return { status: res.status, body, ms: Date.now() - started };
  } catch (err) {
    return { status: 0, body: '', ms: Date.now() - started, error: err.message };
  }
}

// Next.js ships its own 404 copy inside the RSC payload of every page, so
// scanning the raw HTML for error strings fails five healthy pages out of five.
// Strip script blocks first and test only what a reader would actually see.
function visible(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, '');
}

function check(name, res, path, extra) {
  if (res.status !== 200) {
    record(name, false, `${path} returned ${res.status}${res.error ? ` (${res.error})` : ''}`);
    return null;
  }
  if (/Application error|This page could not be found|Internal Server Error/i.test(visible(res.body))) {
    record(name, false, `${path} returned 200 but rendered an error page`);
    return null;
  }
  if (extra) {
    const problem = extra(res.body);
    if (problem) {
      record(name, false, `${path}: ${problem}`);
      return null;
    }
  }
  record(name, true, `${path} ${res.status} in ${res.ms}ms`);
  return res.body;
}

const PAGES = [
  ['homepage', '/'],
  ['order page', '/order'],
  ['kitchen record', '/kitchen-record'],
  ['care guides index', '/care-guides'],
  ['story page', '/story'],
];

console.log(`\nSmoke testing ${base}\n`);

const bodies = {};
for (const [name, path] of PAGES) {
  const res = await get(path);
  bodies[path] = check(name, res, path);
}

// Homepage must render the kitchen record block. It is hardcoded JSX, so a
// missing block means a build or render regression, not a data problem.
if (bodies['/']) {
  const html = bodies['/'];
  const hasHeading = /What has never been in this building/i.test(html);
  const pairs = (html.match(/<dt>/g) || []).length;
  record(
    'kitchen record block renders',
    hasHeading && pairs >= 4,
    hasHeading ? `${pairs} <dt> entries found` : 'heading missing from homepage',
  );
}

// Sitemap and robots are generated routes; a failure here is a build problem.
for (const [name, path] of [['sitemap', '/sitemap.xml'], ['robots', '/robots.txt']]) {
  const res = await get(path);
  check(name, res, path);
}

// Dynamic care-guide route: pull a real slug off the index and fetch it.
if (bodies['/care-guides']) {
  const slugs = [
    ...new Set(
      [...bodies['/care-guides'].matchAll(/href="\/care-guides\/([a-z0-9-]+)"/g)].map((m) => m[1]),
    ),
  ];
  if (slugs.length === 0) {
    record('care guide detail route', false, 'no care-guide links found on the index page');
  } else {
    const res = await get(`/care-guides/${slugs[0]}`);
    check('care guide detail route', res, `/care-guides/${slugs[0]}`);
  }
}

// Every local asset referenced by the pages above. A file can be committed
// broken and still return 200 — that is exactly how two 6-byte SVGs shipped to
// production — so check the bytes, not just the status.
const assets = new Set();
for (const html of Object.values(bodies)) {
  if (!html) continue;
  for (const m of html.matchAll(/(?:src|href)="(\/[^"?#]+\.(?:svg|png|jpe?g|webp|ico|css|js))"/g)) {
    assets.add(m[1]);
  }
  for (const m of html.matchAll(/\/_next\/image\?url=([^"&]+)/g)) {
    try {
      const decoded = decodeURIComponent(m[1]);
      if (decoded.startsWith('/')) assets.add(decoded);
    } catch { /* skip unparseable */ }
  }
}

const brokenAssets = [];
for (const asset of assets) {
  const res = await get(asset);
  if (res.status !== 200) {
    brokenAssets.push(`${asset} → ${res.status}`);
  } else if (res.body.length < 32) {
    brokenAssets.push(`${asset} → only ${res.body.length} bytes`);
  } else if (asset.endsWith('.svg') && !res.body.trimStart().startsWith('<')) {
    brokenAssets.push(`${asset} → not SVG markup`);
  }
}
record(
  'referenced assets load',
  brokenAssets.length === 0,
  brokenAssets.length === 0 ? `${assets.size} assets checked` : brokenAssets.join('; '),
);

console.log(results.map((r) => `${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? ` — ${r.detail}` : ''}`).join('\n'));
console.log(`\n${results.length - failed}/${results.length} checks passed\n`);

process.exit(failed > 0 ? 1 : 0);
