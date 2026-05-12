#!/usr/bin/env node
// Smoke test against the SAP Business Accelerator Hub sandbox
// (https://sandbox.api.sap.com/SAPCALM) using an S-user API key.
//
// Setup:
//   1. Log in to https://api.sap.com with your S-user.
//   2. Avatar → Settings → copy the API key.
//   3. Put it into .env at the project root:
//        CALM_MODE=sandbox
//        CALM_API_KEY=<your-api.sap.com-key>
//        # optional: CALM_BASE_URL=https://sandbox.api.sap.com/SAPCALM
//   4. npm run build && node scripts/smoke-sandbox.mjs
//        # optionally exercise tools that require a project id:
//        node scripts/smoke-sandbox.mjs --project <uuid>
//        # or via env: CALM_PROJECT_ID=<uuid> node scripts/smoke-sandbox.mjs
//
// The script spawns the stdio MCP binary, lists tools, and calls a handful
// of read-only endpoints that are known to be exposed on the sandbox.

import { config as dotenvConfig } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
dotenvConfig({ path: resolve(projectRoot, '.env') });

if (!process.env.CALM_MODE) process.env.CALM_MODE = 'sandbox';
if (process.env.CALM_MODE.toLowerCase() !== 'sandbox') {
  console.error(
    `[smoke-sandbox] CALM_MODE must be "sandbox" (got "${process.env.CALM_MODE}")`,
  );
  process.exit(2);
}
if (!process.env.CALM_API_KEY) {
  console.error(
    '[smoke-sandbox] CALM_API_KEY is required — paste your api.sap.com S-user key into .env',
  );
  process.exit(2);
}

const env = Object.fromEntries(
  Object.entries(process.env).filter(([, v]) => v !== undefined),
);

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [resolve(projectRoot, 'dist/bin/stdio.js')],
  cwd: projectRoot,
  env,
  stderr: 'inherit',
});

const client = new Client(
  { name: 'smoke-sandbox', version: '0.0.1' },
  { capabilities: {} },
);

const t0 = Date.now();
await client.connect(transport);
console.log(`[smoke-sandbox] connected in ${Date.now() - t0}ms`);
console.log(
  `[smoke-sandbox] base URL: ${process.env.CALM_BASE_URL || 'https://sandbox.api.sap.com/SAPCALM'} (sandbox)`,
);

const tools = await client.listTools();
console.log(`[smoke-sandbox] tools/list → ${tools.tools.length} tools`);

let passed = 0;
let failed = 0;

async function callTool(name, args = {}) {
  const start = Date.now();
  try {
    const res = await client.callTool({ name, arguments: args });
    const ms = Date.now() - start;
    const isErr = res.isError === true;
    const first = (res.content?.[0]?.text ?? '').slice(0, 400);
    if (isErr) {
      failed++;
      console.log(`\n[smoke-sandbox] ${name} ERROR (${ms}ms)`);
    } else {
      passed++;
      console.log(`\n[smoke-sandbox] ${name} OK (${ms}ms)`);
    }
    console.log(first);
  } catch (e) {
    failed++;
    console.log(`\n[smoke-sandbox] ${name} THROW: ${e?.message ?? e}`);
  }
}

// --project <uuid> or env CALM_PROJECT_ID. Required by tools that filter by
// projectId — sandbox returns 0 projects, so a real GUID has to be supplied
// externally to exercise the project-scoped tools.
const projectArgIdx = process.argv.indexOf('--project');
const projectId =
  (projectArgIdx >= 0 ? process.argv[projectArgIdx + 1] : undefined) ||
  process.env.CALM_PROJECT_ID;

let skipped = 0;
async function callIfProject(name, args) {
  if (!projectId) {
    skipped++;
    console.log(
      `\n[smoke-sandbox] ${name} SKIPPED (needs --project <uuid> or CALM_PROJECT_ID)`,
    );
    return;
  }
  await callTool(name, { ...args, projectId });
}

// Lookups — cheap, no filters required, good signal that auth works.
await callTool('calm_analytics_list_providers');
await callTool('calm_features_list_statuses');
await callTool('calm_features_list_priorities');

// Lists that work without projectId.
await callTool('calm_projects_list', { limit: 3 });

// Project-scoped lists.
await callIfProject('calm_features_list', { limit: 3 });
await callIfProject('calm_tasks_list', { limit: 3 });
// Known bug as of 2026-05: calm_test_cases_list sends $filter on a property
// 'statusCode' that ManualTestCases doesn't expose → OData 400. Left in the
// run as a diagnostic until the tool is fixed.
await callIfProject('calm_test_cases_list', { limit: 3 });

await client.close();
console.log(
  `\n[smoke-sandbox] done — ${passed} OK, ${failed} error(s), ${skipped} skipped`,
);
process.exit(failed === 0 ? 0 : 1);
