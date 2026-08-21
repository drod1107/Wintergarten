// Read-only: lists Resend domains and their verification status.
// Reads RESEND_API_KEY from a pulled env file path given as argv[2].
// Never prints the key.
import { readFileSync } from 'node:fs';

const envPath = process.argv[2];
const env = readFileSync(envPath, 'utf8');
function get(name) {
  const line = env.split(/\r?\n/).find((l) => l.trim().startsWith(name + '='));
  if (!line) return '';
  return line.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '');
}
const key = get('RESEND_API_KEY');
console.log('RESEND_API_KEY present:', Boolean(key), 'length:', key.length);
console.log('ORDER_NOTIFY_FROM  value:', JSON.stringify(get('ORDER_NOTIFY_FROM')));
console.log('ORDER_NOTIFY_EMAIL value:', JSON.stringify(get('ORDER_NOTIFY_EMAIL')));
console.log('ZAPIER_WEBHOOK_URL set:', Boolean(get('ZAPIER_WEBHOOK_URL')));
if (!key) process.exit(0);

const res = await fetch('https://api.resend.com/domains', {
  headers: { Authorization: `Bearer ${key}` },
});
console.log('domains HTTP', res.status);
const body = await res.json().catch(() => null);
if (body?.data) {
  for (const d of body.data) {
    console.log(`  domain=${d.name} status=${d.status} region=${d.region} id=${d.id}`);
  }
} else {
  console.log('  body:', JSON.stringify(body).slice(0, 400));
}
