import { config as dotenvConfig } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: resolve(__dirname, '..', '.env') });

const { CALM_UAA_URL, CALM_UAA_CLIENT_ID, CALM_UAA_CLIENT_SECRET } = process.env;
if (!CALM_UAA_URL || !CALM_UAA_CLIENT_ID || !CALM_UAA_CLIENT_SECRET) {
  console.error('missing CALM_UAA_* env');
  process.exit(2);
}

const url = `${CALM_UAA_URL.replace(/\/$/, '')}/oauth/token`;
const basic = Buffer.from(`${CALM_UAA_CLIENT_ID}:${CALM_UAA_CLIENT_SECRET}`).toString('base64');

const r = await fetch(url, {
  method: 'POST',
  headers: {
    Authorization: `Basic ${basic}`,
    'Content-Type': 'application/x-www-form-urlencoded',
    Accept: 'application/json',
  },
  body: 'grant_type=client_credentials',
});

if (!r.ok) {
  console.error('token request failed:', r.status, r.statusText, await r.text());
  process.exit(1);
}

const j = await r.json();
console.log('--- token response (top-level) ---');
console.log(JSON.stringify({
  token_type: j.token_type,
  expires_in: j.expires_in,
  scope: j.scope,
  jti: j.jti,
}, null, 2));

const [, payloadB64] = j.access_token.split('.');
const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));

console.log('\n--- JWT payload (claims of interest) ---');
const interesting = [
  'client_id', 'cid', 'azp',
  'grant_type',
  'scope',
  'authorities',
  'aud',
  'iss',
  'sub',
  'user_name',
  'origin',
  'zid', 'ext_attr',
  'xs.system.attributes', 'xs.user.attributes',
];
for (const k of interesting) {
  if (k in payload) console.log(`${k}:`, JSON.stringify(payload[k]));
}

console.log('\n--- full payload keys ---');
console.log(Object.keys(payload).join(', '));
