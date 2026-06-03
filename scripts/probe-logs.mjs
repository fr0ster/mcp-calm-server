#!/usr/bin/env node
// Probe the Cloud ALM Logs GET endpoint with the FULL live query shape —
//   /calm-logs/v1/logs?version=V1&period=60M&provider=…&serviceId=…
//                      &category=ABAP%20Runtime&format=protobuf-json
// — going through the typed client (`calm.getLogs().get(...)`), NOT the
// MCP tool, so we observe the RAW body the connection hands back (a Buffer
// for `application/x-protobuf`, a plain object for JSON/empty).
//
// Purpose: stop *assuming* `format`/`category`/`version` are wire no-ops.
// This runs several variants and reports body type + size + decodability so
// their real effect can be verified against a live tenant. If a variant
// changes the response, you'll see it here; if it doesn't, that's now an
// observation, not a guess.
//
// Requires live env (OAuth2 tenant — sandbox has no public log provider):
//   CALM_MODE=oauth2  CALM_BASE_URL=…  + the three UAA vars.
// Override the query via env:
//   LOGS_PROVIDER  (default exm.im)
//   LOGS_SERVICE_ID(default bc6c21e9-f673-4917-b2ad-6618b8e75be9)
//   LOGS_PERIOD    (default 60M)
//   LOGS_CATEGORY  (default "ABAP Runtime")
//   LOGS_VERSION   (default V1)
import { config as dotenvConfig } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
dotenvConfig({ path: resolve(projectRoot, '.env') });

const { buildCalmClient } = await import('../dist/server/buildClient.js');
const { readConfig } = await import('../dist/server/config.js');
const { decodeOtlpLogs } = await import('../dist/tools/logs/otlpLogs.js');

const calm = await buildCalmClient(readConfig());

const base = {
  provider: process.env.LOGS_PROVIDER ?? 'exm.im',
  serviceId: process.env.LOGS_SERVICE_ID ?? 'bc6c21e9-f673-4917-b2ad-6618b8e75be9',
  period: process.env.LOGS_PERIOD ?? '60M',
  category: process.env.LOGS_CATEGORY ?? 'ABAP Runtime',
  version: process.env.LOGS_VERSION ?? 'V1',
};

// Variants isolate one query knob at a time so its wire effect is visible.
const variants = [
  ['full (version+category+format=protobuf-json)', { ...base, format: 'protobuf-json' }],
  ['no format', { ...base }],
  ['format=json', { ...base, format: 'json' }],
  ['no category', { provider: base.provider, serviceId: base.serviceId, period: base.period, version: base.version }],
  ['no version', { provider: base.provider, serviceId: base.serviceId, period: base.period, category: base.category }],
];

function describeBody(body) {
  if (body === undefined) return 'EMPTY  (response.data === undefined)';
  if (body === null) return 'EMPTY  (response.data === null)';
  if (Buffer.isBuffer(body) || body instanceof Uint8Array) {
    const bytes = Buffer.from(body);
    let decoded = 'decode-failed';
    let count = '?';
    try {
      const otlp = decodeOtlpLogs(bytes);
      const rls = Array.isArray(otlp?.resourceLogs) ? otlp.resourceLogs : [];
      count = String(rls.length);
      decoded = 'ok';
    } catch (e) {
      decoded = `decode-failed: ${e?.message ?? e}`;
    }
    return `BINARY ${String(bytes.length).padStart(7)}B  decode=${decoded} resourceLogs=${count}`;
  }
  const ctor = body?.constructor?.name ?? typeof body;
  const json = JSON.stringify(body) ?? String(body);
  return `${`JSON<${ctor}>`.padEnd(14)} ${String(json.length).padStart(5)}c  ${json.slice(0, 120)}`;
}

console.log(`probe-logs → ${base.provider} / ${base.serviceId} / period=${base.period}\n`);
for (const [label, params] of variants) {
  const t0 = Date.now();
  try {
    const body = await calm.getLogs().get(params);
    const ms = Date.now() - t0;
    console.log(`${label.padEnd(46)} OK  ${String(ms).padStart(6)}ms  ${describeBody(body)}`);
  } catch (err) {
    const ms = Date.now() - t0;
    const code = err?.code ?? err?.status ?? 'THROW';
    console.log(`${label.padEnd(46)} ERR ${String(ms).padStart(6)}ms  ${code}  ${err?.message ?? err}`);
  }
}
