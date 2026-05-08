import { config as dotenvConfig } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import { exec } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
dotenvConfig({ path: resolve(projectRoot, '.env') });

const { CALM_UAA_URL, CALM_UAA_CLIENT_ID, CALM_UAA_CLIENT_SECRET, CALM_BASE_URL } = process.env;
if (!CALM_UAA_URL || !CALM_UAA_CLIENT_ID || !CALM_UAA_CLIENT_SECRET) {
  console.error('missing CALM_UAA_* env');
  process.exit(2);
}

const PORT = Number(process.env.AUTH_REDIRECT_PORT || 3001);
const TIMEOUT_MS = Number(process.env.AUTH_TIMEOUT_MS || 5 * 60 * 1000);
const REDIRECT_URI = `http://localhost:${PORT}/callback`;

const authorizeUrl =
  `${CALM_UAA_URL.replace(/\/$/, '')}/oauth/authorize` +
  `?response_type=code` +
  `&client_id=${encodeURIComponent(CALM_UAA_CLIENT_ID)}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

console.log('--- auth-code flow ---');
console.log('uaa:        ', CALM_UAA_URL);
console.log('clientId:   ', CALM_UAA_CLIENT_ID);
console.log('redirect:   ', REDIRECT_URI);
console.log('timeout:    ', TIMEOUT_MS / 1000, 's');
console.log('\nauthorize URL:\n', authorizeUrl, '\n');

function waitForCode() {
  return new Promise((resolveCode, rejectCode) => {
    const server = http.createServer((req, res) => {
      const u = new URL(req.url, `http://localhost:${PORT}`);
      if (u.pathname !== '/callback') {
        res.writeHead(404, { 'content-type': 'text/plain' });
        res.end('not found');
        return;
      }
      const code = u.searchParams.get('code');
      const error = u.searchParams.get('error');
      const errorDesc = u.searchParams.get('error_description');
      if (error) {
        res.writeHead(400, { 'content-type': 'text/html; charset=utf-8' });
        res.end(`<h1>OAuth error</h1><p>${error}</p><pre>${errorDesc ?? ''}</pre>`);
        server.close();
        rejectCode(new Error(`oauth error: ${error} — ${errorDesc ?? ''}`));
        return;
      }
      if (!code) {
        res.writeHead(400, { 'content-type': 'text/plain' });
        res.end('missing ?code');
        server.close();
        rejectCode(new Error('callback hit without code'));
        return;
      }
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end('<h1>OK — code received</h1><p>You can close this tab.</p>');
      server.close();
      resolveCode(code);
    });
    server.listen(PORT, () => {
      console.log(`[smoke] callback server listening on ${PORT}`);
    });
    setTimeout(() => {
      server.close();
      rejectCode(new Error(`timeout after ${TIMEOUT_MS / 1000}s waiting for callback`));
    }, TIMEOUT_MS);
  });
}

function openBrowser(url) {
  const cmd = process.platform === 'win32'
    ? `start "" "${url}"`
    : process.platform === 'darwin'
      ? `open "${url}"`
      : `xdg-open "${url}"`;
  exec(cmd, (err) => {
    if (err) console.error('[smoke] failed to auto-open browser:', err.message, '— open manually');
  });
}

console.log('[smoke] opening browser…');
openBrowser(authorizeUrl);

let code;
try {
  code = await waitForCode();
} catch (e) {
  console.error('\n[smoke] auth code wait failed:', e.message);
  process.exit(1);
}
console.log('\n[smoke] got code (len=' + code.length + '), exchanging for tokens…');

const tokenUrl = `${CALM_UAA_URL.replace(/\/$/, '')}/oauth/token`;
const basic = Buffer.from(`${CALM_UAA_CLIENT_ID}:${CALM_UAA_CLIENT_SECRET}`).toString('base64');
const body = new URLSearchParams({
  grant_type: 'authorization_code',
  code,
  redirect_uri: REDIRECT_URI,
});

const tokenRes = await fetch(tokenUrl, {
  method: 'POST',
  headers: {
    Authorization: `Basic ${basic}`,
    'Content-Type': 'application/x-www-form-urlencoded',
    Accept: 'application/json',
  },
  body: body.toString(),
});
const tokenText = await tokenRes.text();
if (!tokenRes.ok) {
  console.error('[smoke] /oauth/token failed:', tokenRes.status, tokenRes.statusText);
  console.error(tokenText);
  process.exit(1);
}
const tokenJson = JSON.parse(tokenText);
console.log('\n--- token response (top-level) ---');
console.log(JSON.stringify({
  token_type: tokenJson.token_type,
  expires_in: tokenJson.expires_in,
  scope_count: tokenJson.scope?.split(' ').length,
  has_refresh_token: !!tokenJson.refresh_token,
  jti: tokenJson.jti,
}, null, 2));

const [, payloadB64] = tokenJson.access_token.split('.');
const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));

console.log('\n--- JWT user-context claims ---');
for (const k of [
  'grant_type', 'user_name', 'email', 'given_name', 'family_name',
  'user_id', 'origin', 'sub', 'cid', 'azp',
  'xs.user.attributes', 'xs.system.attributes',
]) {
  if (k in payload) console.log(`  ${k}:`, JSON.stringify(payload[k]));
}
console.log('\n--- scopes (', payload.scope?.length ?? 0, ') ---');
for (const s of payload.scope ?? []) console.log('  ', s);

console.log('\n--- direct API smoke: GET /api/calm-projects/v1/projects?$top=5 ---');
const url = `${CALM_BASE_URL.replace(/\/$/, '')}/api/calm-projects/v1/projects?$top=5`;
const r = await fetch(url, {
  headers: {
    Authorization: `Bearer ${tokenJson.access_token}`,
    Accept: 'application/json',
  },
});
console.log('status:', r.status, r.statusText);
const text = await r.text();
console.log('body  :', text.slice(0, 1500));
process.exit(0);
