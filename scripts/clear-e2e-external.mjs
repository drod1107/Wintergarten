#!/usr/bin/env node
/**
 * clear-e2e-external.mjs — one-command teardown of Wintergarten Bakehouse E2E test data.
 *
 * Run from the repo root. Dry run by default; --confirm to actually delete.
 *
 *   node scripts/clear-e2e-external.mjs             # dry run, shows what would go
 *   node scripts/clear-e2e-external.mjs --confirm   # delete
 *
 * SAFETY MODEL (mirrors scripts/clear-e2e-orders.mjs)
 * ---------------------------------------------------
 * A record is only ever touched when BOTH markers match by exact equality:
 *   email domain === E2E_EMAIL_DOMAIN   and   name === E2E_NAME
 * Both constants are imported from scripts/e2e-marker.mjs — never retyped here,
 * because E2E_NAME contains an em dash (U+2014) and a mistyped copy would
 * silently match nothing. There is no LIKE, no wildcard, no prefix, no fuzzy
 * comparison anywhere in this file. A typo in one field deletes nothing.
 *
 * Every candidate is checked twice: once through the repo's own isE2eRow(), and
 * once through an independently written equality check below. If the two ever
 * disagree the run aborts rather than guessing.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

// ---------------------------------------------------------------------------
// Limits. Cleanup after a testing session touches a handful of records. Numbers
// far above that mean the marker logic is wrong or we are pointed at the wrong
// account, and bulk-deleting would be the worst possible response.
// ---------------------------------------------------------------------------
const SANITY_LIMIT_CONTACTS = 50;
const SANITY_LIMIT_INVOICES = 500;
const MAX_CONTACT_PAGES = 50;   // 50 x 200 = 10,000 contacts scanned before abort
const MAX_INVOICE_PAGES = 10;
const HTTP_TIMEOUT_MS = 8000;

const DEFAULT_ORG_ID = '933666561';
const REAL_ACCOUNTS_BASE = 'https://accounts.zoho.com';
const REAL_API_BASE = 'https://www.zohoapis.com/books/v3';

// ---------------------------------------------------------------------------
// Output. Everything printed goes through say() so the redaction pass cannot be
// bypassed by accident — including error strings, which is where credentials
// most often leak.
// ---------------------------------------------------------------------------
const SECRETS = new Set();
function registerSecret(value) {
  if (typeof value === 'string' && value.length >= 8) SECRETS.add(value);
}
function redact(text) {
  let out = String(text);
  for (const secret of SECRETS) out = out.split(secret).join('***');
  // Belt and braces: Zoho access tokens are returned in JSON bodies we never
  // intend to print, but if one reaches here anyway, mask it.
  out = out.replace(/"access_token"\s*:\s*"[^"]*"/g, '"access_token":"***"');
  out = out.replace(/Zoho-oauthtoken\s+\S+/g, 'Zoho-oauthtoken ***');
  return out;
}
function say(...parts) { console.log(redact(parts.join(' '))); }
function warn(...parts) { console.log(redact('WARN: ' + parts.join(' '))); }

class Abort extends Error {}          // pre-flight / safety refusal -> "ABORT:"
class CleanupFailed extends Error {}  // something broke mid-run -> "CLEANUP_FAILED:"

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = { confirm: false, only: 'all', repo: process.cwd(), help: false };
  for (const arg of argv) {
    if (arg === '--confirm') args.confirm = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg.startsWith('--only=')) args.only = arg.slice('--only='.length);
    else if (arg.startsWith('--repo=')) args.repo = arg.slice('--repo='.length);
    else throw new Abort(`unknown argument "${arg}". Try --help.`);
  }
  if (!['all', 'zoho', 'db'].includes(args.only)) {
    throw new Abort(`--only must be one of all, zoho, db (got "${args.only}").`);
  }
  args.repo = resolve(args.repo);
  return args;
}

const HELP = `
clear-e2e-external.mjs — remove Wintergarten E2E test data from the preview
database and from Zoho Books, in one command.

  node scripts/clear-e2e-external.mjs                 dry run (default)
  node scripts/clear-e2e-external.mjs --confirm       actually delete
  node scripts/clear-e2e-external.mjs --only=zoho     Zoho Books only
  node scripts/clear-e2e-external.mjs --only=db       preview database only
  node scripts/clear-e2e-external.mjs --repo=/path    repo root (default: cwd)

Cleans:   preview database (delegated to scripts/clear-e2e-orders.mjs)
          Zoho Books contacts matching the E2E marker, and their invoices
Cannot clean, and says so rather than pretending:
          Zapier task history — Zapier exposes no delete API
          Resend — sent email cannot be unsent
`.trim();

// ---------------------------------------------------------------------------
// .env.local — parsed by hand, same shape as scripts/clear-e2e-orders.mjs, since
// the repo has no dotenv dependency and a plain .mjs script gets none of the
// loading Next.js does for you. Values are registered as secrets immediately so
// that nothing downstream can print them.
// ---------------------------------------------------------------------------
function readEnvLocal(repoRoot) {
  const path = join(repoRoot, '.env.local');
  if (!existsSync(path)) return {};
  const values = {};
  for (const rawLine of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function loadZohoCredentials(repoRoot) {
  const fileEnv = readEnvLocal(repoRoot);
  const pick = (name) => process.env[name] || fileEnv[name] || '';

  const creds = {
    clientId: pick('ZOHO_CLIENT_ID'),
    clientSecret: pick('ZOHO_CLIENT_SECRET'),
    refreshToken: pick('ZOHO_REFRESH_TOKEN'),
    orgId: pick('ZOHO_ORG_ID') || DEFAULT_ORG_ID,
  };
  registerSecret(creds.clientId);
  registerSecret(creds.clientSecret);
  registerSecret(creds.refreshToken);

  const missing = ['clientId', 'clientSecret', 'refreshToken']
    .filter((key) => !creds[key])
    .map((key) => ({ clientId: 'ZOHO_CLIENT_ID', clientSecret: 'ZOHO_CLIENT_SECRET', refreshToken: 'ZOHO_REFRESH_TOKEN' }[key]));
  if (missing.length) {
    // Names only. Never values.
    throw new Abort(`missing Zoho credentials in environment or .env.local: ${missing.join(', ')}`);
  }
  return creds;
}

// Endpoint overrides exist so the deletion path can be exercised against a mock
// server without touching a real account. They are ignored unless the test flag
// is explicitly set, so a stray environment variable cannot silently redirect a
// real run.
function resolveEndpoints() {
  if (process.env.E2E_CLEANUP_TEST_ENDPOINTS === '1') {
    return {
      accounts: process.env.ZOHO_ACCOUNTS_BASE || REAL_ACCOUNTS_BASE,
      api: process.env.ZOHO_API_BASE || REAL_API_BASE,
      isMock: true,
    };
  }
  return { accounts: REAL_ACCOUNTS_BASE, api: REAL_API_BASE, isMock: false };
}

// ---------------------------------------------------------------------------
// Zoho Books client — same refresh and call shape as lib/zoho.ts
// ---------------------------------------------------------------------------
async function refreshAccessToken(creds, endpoints) {
  const body = new URLSearchParams({
    refresh_token: creds.refreshToken,
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    grant_type: 'refresh_token',
  });

  let response;
  try {
    response = await fetch(`${endpoints.accounts}/oauth/v2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
    });
  } catch (error) {
    throw new Abort(`could not reach Zoho accounts endpoint (${error.name || 'error'}).`);
  }
  if (!response.ok) {
    // Status only. The body of a token response is exactly where a credential
    // would be, so it is never surfaced.
    throw new Abort(`Zoho token refresh rejected with HTTP ${response.status}.`);
  }

  let payload;
  try { payload = await response.json(); }
  catch { throw new Abort('Zoho token refresh returned a response that was not JSON.'); }

  const token = payload && payload.access_token;
  if (!token) throw new Abort('Zoho token refresh returned no access_token.');
  registerSecret(token);
  return token;
}

function makeClient(token, creds, endpoints) {
  async function call(path, init = {}) {
    const separator = path.includes('?') ? '&' : '?';
    const url = `${endpoints.api}${path}${separator}organization_id=${encodeURIComponent(creds.orgId)}`;

    let response;
    try {
      response = await fetch(url, {
        ...init,
        headers: {
          Authorization: `Zoho-oauthtoken ${token}`,
          'Content-Type': 'application/json',
          ...(init.headers || {}),
        },
        signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
      });
    } catch (error) {
      throw new CleanupFailed(`Zoho request to ${path} failed (${error.name || 'error'}).`);
    }

    let payload = null;
    try { payload = await response.json(); } catch { /* some deletes return no body */ }

    if (!response.ok) {
      // Zoho's own message is safe and useful; the raw body is not surfaced.
      const detail = payload && payload.message ? payload.message : `HTTP ${response.status}`;
      const error = new CleanupFailed(`Zoho ${path}: ${detail}`);
      error.zohoCode = payload && payload.code;
      error.httpStatus = response.status;
      throw error;
    }
    return payload || {};
  }
  return call;
}

async function listAllPages(call, path, collectionKey, maxPages) {
  const items = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const separator = path.includes('?') ? '&' : '?';
    const payload = await call(`${path}${separator}per_page=200&page=${page}`);
    const batch = payload[collectionKey] || [];
    items.push(...batch);
    const context = payload.page_context || {};
    if (!context.has_more_page) return items;
  }
  throw new Abort(
    `${collectionKey} listing exceeded ${maxPages} pages. Refusing to continue on a ` +
    `partial view of the account rather than risk reporting a false "nothing to clean".`
  );
}

// ---------------------------------------------------------------------------
// Marker matching
// ---------------------------------------------------------------------------
/**
 * Independent second opinion on the marker, deliberately written with a
 * different string operation than e2e-marker.mjs uses. Agreement between two
 * separate implementations is the check; disagreement aborts the run. An
 * address with more than one "@" is precisely the case where they diverge, and
 * that is a record we want to refuse rather than delete.
 */
function independentMarkerCheck(email, name, expectedDomain, expectedName) {
  const address = String(email || '');
  const at = address.indexOf('@');
  const domain = at === -1 ? '' : address.slice(at + 1);
  return domain === expectedDomain && name === expectedName;
}

function selectMarkedContacts(contacts, marker) {
  const { isE2eRow, E2E_EMAIL_DOMAIN, E2E_NAME } = marker;
  const matched = [];
  for (const contact of contacts) {
    const email = contact.email || '';
    const name = contact.contact_name || '';
    const repoSays = isE2eRow({ email, name });
    const localSays = independentMarkerCheck(email, name, E2E_EMAIL_DOMAIN, E2E_NAME);
    if (repoSays !== localSays) {
      throw new Abort(
        `marker checks disagree for Zoho contact ${contact.contact_id}. ` +
        `Refusing to delete anything on an ambiguous match.`
      );
    }
    if (repoSays) matched.push(contact);
  }
  return matched;
}

// ---------------------------------------------------------------------------
// Zoho Books cleanup
// ---------------------------------------------------------------------------
async function cleanZohoBooks({ repoRoot, marker, confirm }) {
  const result = { contactsMatched: 0, contactsDeleted: 0, invoicesMatched: 0, invoicesDeleted: 0, failures: [] };

  const creds = loadZohoCredentials(repoRoot);
  const endpoints = resolveEndpoints();
  if (endpoints.isMock) warn('E2E_CLEANUP_TEST_ENDPOINTS=1 — talking to overridden endpoints, not real Zoho Books.');

  const token = await refreshAccessToken(creds, endpoints);
  const call = makeClient(token, creds, endpoints);

  // The whole contact list is scanned and filtered locally rather than handed to
  // Zoho's search parameters. Zoho's *_contains filters are substring matches,
  // which is the fuzzy behaviour the marker rule forbids; and if a server-side
  // filter ever silently returned nothing we would report a clean account that
  // was not clean. A full scan cannot fail that way.
  const contacts = await listAllPages(call, '/contacts', 'contacts', MAX_CONTACT_PAGES);
  const matched = selectMarkedContacts(contacts, marker);
  result.contactsMatched = matched.length;
  result.contactsScanned = contacts.length;

  // "0 matched" only means something next to the number it was matched against.
  // Printed on every run so that a scan which silently returned nothing is
  // distinguishable from a genuinely clean account — those look identical
  // otherwise, and the second one is the failure nobody notices.
  say(`Zoho Books: scanned ${contacts.length} contact(s); ${matched.length} matched the E2E marker.`);
  if (contacts.length === 0) {
    warn(
      'the contact scan returned no records at all. A live organization should not be empty — ' +
      'check ZOHO_ORG_ID before trusting a "nothing to clean" result.'
    );
  }

  if (matched.length > SANITY_LIMIT_CONTACTS) {
    throw new Abort(
      `${matched.length} Zoho contacts matched the E2E marker, over the sanity limit of ` +
      `${SANITY_LIMIT_CONTACTS}. Nothing deleted. Check the marker and the organization id.`
    );
  }

  if (matched.length === 0) {
    say('Zoho Books: nothing to clean.');
    return result;
  }

  // Gather invoices per contact. Scoping by customer_id is the safety boundary:
  // an invoice is only ever in scope because the contact it belongs to already
  // matched both markers.
  const plan = [];
  for (const contact of matched) {
    const invoices = await listAllPages(
      call, `/invoices?customer_id=${encodeURIComponent(contact.contact_id)}`, 'invoices', MAX_INVOICE_PAGES
    );
    result.invoicesMatched += invoices.length;
    plan.push({ contact, invoices });
  }

  if (result.invoicesMatched > SANITY_LIMIT_INVOICES) {
    throw new Abort(
      `${result.invoicesMatched} invoices attached to marker contacts, over the sanity limit of ` +
      `${SANITY_LIMIT_INVOICES}. Nothing deleted.`
    );
  }

  for (const { contact, invoices } of plan) {
    say(`contact ${contact.contact_id}  ${contact.contact_name}  <${contact.email}>  (${invoices.length} invoice${invoices.length === 1 ? '' : 's'})`);
    for (const invoice of invoices) {
      const reference = invoice.reference_number || '(no reference)';
      say(`  invoice ${invoice.invoice_id}  ${invoice.invoice_number || ''}  ref ${reference}  status ${invoice.status || '?'}`);
      // Invoices raised by the site carry WEB-<orderId>. Anything else on a
      // marker contact is still test data and still goes, but it is worth
      // seeing, because it means something other than the checkout wrote here.
      if (!/^WEB-/.test(reference)) {
        warn(`invoice ${invoice.invoice_id} on a marker contact has an unexpected reference "${reference}".`);
      }
    }
  }
  say('');

  if (!confirm) {
    say(`Zoho Books: DRY RUN — ${result.contactsMatched} contact(s) and ${result.invoicesMatched} invoice(s) would be deleted. Re-run with --confirm.`);
    return result;
  }

  // Zoho has no transaction across HTTP calls, so unlike the database script
  // this cannot be all-or-nothing. Invoices go first because Zoho will not
  // delete a contact that still has transactions attached. If the run dies
  // halfway, what is left behind is still marker-matched, so the next run
  // finishes the job — which is why idempotency matters more here than atomicity.
  for (const { contact, invoices } of plan) {
    let deletedForContact = 0;
    for (const invoice of invoices) {
      try {
        await deleteInvoice(call, invoice);
        deletedForContact += 1;
        result.invoicesDeleted += 1;
      } catch (error) {
        result.failures.push(`invoice ${invoice.invoice_id}: ${error.message}`);
      }
    }

    if (deletedForContact !== invoices.length) {
      result.failures.push(
        `contact ${contact.contact_id}: left in place — ${invoices.length - deletedForContact} of ` +
        `${invoices.length} invoice(s) could not be deleted, and Zoho will not delete a contact with transactions.`
      );
      continue;
    }

    try {
      await call(`/contacts/${encodeURIComponent(contact.contact_id)}`, { method: 'DELETE' });
      result.contactsDeleted += 1;
    } catch (error) {
      result.failures.push(`contact ${contact.contact_id}: ${error.message}`);
    }
  }

  return result;
}

async function deleteInvoice(call, invoice) {
  const id = encodeURIComponent(invoice.invoice_id);
  try {
    await call(`/invoices/${id}`, { method: 'DELETE' });
    return;
  } catch (error) {
    // Zoho refuses to delete an invoice that has been sent or has payments
    // applied. Voiding first clears the sent case. This only ever runs against
    // an invoice already proven to belong to a marker-matching contact.
    if (invoice.status === 'void') throw error;
    try {
      await call(`/invoices/${id}/status/void`, { method: 'POST' });
    } catch {
      throw error; // report the original, more informative refusal
    }
    await call(`/invoices/${id}`, { method: 'DELETE' });
  }
}

// ---------------------------------------------------------------------------
// Preview database — delegated to the script that already does this well
// ---------------------------------------------------------------------------
async function cleanPreviewDatabase({ repoRoot, marker, confirm }) {
  const script = join(repoRoot, 'scripts', 'clear-e2e-orders.mjs');
  if (!existsSync(script)) {
    throw new Abort(`expected ${script} — run this from the repo root or pass --repo=<path>.`);
  }

  const args = ['scripts/clear-e2e-orders.mjs', ...(confirm ? ['--confirm'] : [])];
  const child = spawn(process.execPath, args, { cwd: repoRoot, stdio: ['ignore', 'pipe', 'pipe'] });

  let captured = '';
  const relay = (stream) => {
    stream.setEncoding('utf8');
    stream.on('data', (chunk) => {
      captured += chunk;
      for (const line of chunk.split('\n')) if (line.trim()) say('  [db]', line.trimEnd());
    });
  };
  relay(child.stdout);
  relay(child.stderr);

  const code = await new Promise((resolveExit) => {
    child.on('error', () => resolveExit(-1));
    child.on('close', resolveExit);
  });

  // Display-only count, derived from the child's own output. It never feeds a
  // deletion decision — clear-e2e-orders.mjs owns that entirely.
  const reported = captured.split('\n').filter((line) => line.includes(`@${marker.E2E_EMAIL_DOMAIN}`)).length;
  return { exitCode: code, reported };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { console.log(HELP); return 0; }

  const markerPath = join(args.repo, 'scripts', 'e2e-marker.mjs');
  if (!existsSync(markerPath)) {
    throw new Abort(
      `cannot find ${markerPath}. This script imports the marker constants from the repo on ` +
      `purpose — a marker defined in two places drifts. Run from the repo root or pass --repo=<path>.`
    );
  }
  const marker = await import(pathToFileURL(markerPath).href);
  for (const name of ['E2E_EMAIL_DOMAIN', 'E2E_NAME', 'isE2eRow']) {
    if (!marker[name]) throw new Abort(`scripts/e2e-marker.mjs does not export ${name}.`);
  }

  say(args.confirm ? 'Mode: CONFIRM — records will be deleted.' : 'Mode: DRY RUN — nothing will be deleted.');
  say(`Marker: name equals the constant in scripts/e2e-marker.mjs, email domain equals ${marker.E2E_EMAIL_DOMAIN}`);
  say('');

  const summary = [];
  let failed = false;

  if (args.only === 'all' || args.only === 'db') {
    say('── Preview database ' + '─'.repeat(40));
    const db = await cleanPreviewDatabase({ repoRoot: args.repo, marker, confirm: args.confirm });
    if (db.exitCode === 0) {
      summary.push(['Preview database', args.confirm
        ? `cleaned (${db.reported} test order line(s) reported)`
        : `dry run (${db.reported} test order line(s) would go)`]);
    } else {
      failed = true;
      summary.push(['Preview database', `FAILED — clear-e2e-orders.mjs exited ${db.exitCode}`]);
    }
    say('');
  }

  if (args.only === 'all' || args.only === 'zoho') {
    say('── Zoho Books ' + '─'.repeat(46));
    const zoho = await cleanZohoBooks({ repoRoot: args.repo, marker, confirm: args.confirm });
    if (zoho.failures.length) {
      failed = true;
      for (const failure of zoho.failures) say(`  ! ${failure}`);
      summary.push(['Zoho Books', `FAILED — ${zoho.failures.length} record(s) could not be deleted`]);
    } else if (!args.confirm) {
      summary.push(['Zoho Books', `dry run (${zoho.contactsMatched} contact(s), ${zoho.invoicesMatched} invoice(s) would go)`]);
    } else {
      summary.push(['Zoho Books', zoho.contactsMatched === 0
        ? 'nothing to clean'
        : `${zoho.contactsDeleted} contact(s), ${zoho.invoicesDeleted} invoice(s) deleted`]);
    }
    say('');
  }

  summary.push(['Zapier', 'NOT CLEANABLE — no delete API for Zap history; test runs stay until they age out']);
  summary.push(['Resend', 'NOT CLEANABLE — sent email cannot be unsent']);

  say('── Summary ' + '─'.repeat(49));
  const width = Math.max(...summary.map(([label]) => label.length));
  for (const [label, value] of summary) say(`${label.padEnd(width)} : ${value}`);
  say('─'.repeat(60));

  return failed ? 1 : 0;
}

main()
  .then((code) => { process.exit(code); })
  .catch((error) => {
    const prefix = error instanceof Abort ? 'ABORT' : 'CLEANUP_FAILED';
    console.error(redact(`${prefix}: ${error.message}`));
    process.exit(1);
  });
