// Smoke test against a deployed Wintergarten URL.
//   node scripts/smoke-test.mjs https://wintergarten-git-dev-windrose.vercel.app
// Checks every public page renders, is dynamic (not frozen at build time),
// and that the order window / stand blocks reflect the live database.

const BASE = process.argv[2];
if (!BASE) throw new Error('Pass the base URL as argv[2].');

let failures = 0;
const ok = (label, pass, detail = '') => {
  if (!pass) failures++;
  console.log(`${pass ? 'ok  ' : 'FAIL'}  ${label}${detail ? ' — ' + detail : ''}`);
};

async function get(path) {
  const res = await fetch(BASE + path, {
    headers: { 'Cache-Control': 'no-cache', pragma: 'no-cache' },
  });
  return { status: res.status, headers: res.headers, body: await res.text() };
}

console.log(`\nSmoke test: ${BASE}\n`);

// --- Public pages return 200 and are not error shells --------------------
const pages = [
  '/', '/order', '/kitchen-record', '/story', '/care-guides',
  '/care-guides/pothos-in-water-pothos-in-soil',
];
const fetched = {};
for (const p of pages) {
  const r = await get(p);
  fetched[p] = r;
  ok(`GET ${p}`, r.status === 200, `status ${r.status}`);
  if (r.status === 200) {
    ok(`  no error boundary on ${p}`,
      !/Application error|client-side exception|500: Internal/i.test(r.body));
  }
}

// --- Dynamic rendering: the regression that caused this whole feature ----
// A prerendered page carries no cache-control that varies per request.
// Two consecutive fetches of a dynamic page should both be served fresh.
for (const p of ['/', '/kitchen-record', '/story', '/care-guides']) {
  const cc = fetched[p].headers.get('cache-control') || '';
  ok(`${p} is dynamic (not statically prerendered)`,
    /no-store|no-cache|max-age=0|must-revalidate|private/i.test(cc),
    `cache-control: ${cc || '(none)'}`);
}

// --- Order window reflects the recurring schedule ------------------------
const home = fetched['/'].body;
const stamp = (home.match(/<div class="stamp">([\s\S]{0,200}?)<\/div>/) || [])[1] || '';
const stampText = stamp.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
ok('order window renders a state', /Orders (open|closed)|Sold out/.test(stampText), stampText);

// It is currently inside the Sun 08:00 → Thu 20:00 CST window.
const nowCst = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Chicago', weekday: 'short', hour: '2-digit', hour12: false,
}).formatToParts(new Date());
const dow = nowCst.find((p) => p.type === 'weekday').value;
const hr = Number(nowCst.find((p) => p.type === 'hour').value);
const idx = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(dow);
const shouldBeOpen =
  (idx === 0 && hr >= 8) || (idx > 0 && idx < 4) || (idx === 4 && hr < 20);
ok(`window state matches the schedule (now ${dow} ${hr}:00 CST)`,
  shouldBeOpen ? /Orders open/.test(stampText) : !/Orders open/.test(stampText),
  stampText);

// Close time must be rendered in Central, not the server's UTC clock.
const closing = (stampText.match(/Closing ([^~]+?)(?:Place an order|$)/) || [])[1] || '';
if (/Orders open/.test(stampText)) {
  ok('close time is Central, not UTC', /8 PM|8:00 PM/.test(closing), `"${closing.trim()}"`);
}

// --- Farm stand shows Coming Soon (enabled=false in the database) --------
const standHeading = (home.match(/id="stand-heading">([^<]*)</) || [])[1] || '';
ok('stand shows Coming Soon', /coming soon/i.test(standHeading), standHeading);
ok('stand does not show a live open/closed pill', !/status-pill/.test(home));

// --- Catalogue is coming from the migrated database ---------------------
const skus = [...home.matchAll(/<span>(WG[^<]*)<\/span>/g)].map((m) => m[1]);
ok('products render from the database', skus.length > 0, `${skus.length} SKUs`);
ok('Holiday Cactus present (proves new DB)', skus.some((s) => s.includes('P') && s.includes('006')));

// --- Kitchen record content is present, not an empty section ------------
const kr = fetched['/kitchen-record'].body;
ok('kitchen record has cross-contact content', /mammal-free|gluten-free/i.test(kr));
ok('kitchen record lists ingredients', /ingredient/i.test(kr));

// --- Care guides render -------------------------------------------------
ok('care guides index lists guides',
  (fetched['/care-guides'].body.match(/care-guides\//g) || []).length > 1);
ok('care guide detail renders body', fetched['/care-guides/pothos-in-water-pothos-in-soil'].body.length > 2000);

// --- Admin is protected -------------------------------------------------
const dash = await get('/admin/dashboard');
ok('admin dashboard requires auth', /password/i.test(dash.body) || dash.status === 401 || dash.status === 307,
  `status ${dash.status}`);
const api = await fetch(BASE + '/api/admin/window', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
});
ok('admin API rejects unauthenticated writes', api.status === 401, `status ${api.status}`);

// --- No demo-mode banner (would mean DATABASE_URL is unset) -------------
ok('not running in demo mode', !/demo mode/i.test(home));

console.log(failures === 0 ? '\nAll checks passed.\n' : `\n${failures} check(s) FAILED.\n`);
process.exit(failures === 0 ? 0 : 1);
