import { config as dotenvConfig } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
dotenvConfig({ path: resolve(projectRoot, '.env') });

const required = ['CALM_MODE', 'CALM_BASE_URL'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error('[smoke] missing env:', missing.join(', '));
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

const client = new Client({ name: 'smoke-mcp', version: '0.0.1' }, { capabilities: {} });

const t0 = Date.now();
await client.connect(transport);
console.log(`[smoke] connected in ${Date.now() - t0}ms`);

const tools = await client.listTools();
console.log(`[smoke] tools/list → ${tools.tools.length} tools`);
for (const t of tools.tools) console.log(`  - ${t.name}`);

async function callTool(name, args = {}) {
  const start = Date.now();
  try {
    const res = await client.callTool({ name, arguments: args });
    const ms = Date.now() - start;
    const isErr = res.isError === true;
    const first = (res.content?.[0]?.text ?? '').slice(0, 400);
    console.log(`\n[smoke] ${name} ${isErr ? 'ERROR' : 'OK'} (${ms}ms)`);
    console.log(first);
  } catch (e) {
    console.log(`\n[smoke] ${name} THROW: ${e?.message ?? e}`);
  }
}

await callTool('calm_analytics_list_providers');
await callTool('calm_features_list_statuses');
await callTool('calm_features_list_priorities');
await callTool('calm_projects_list', { limit: 3 });
await callTool('calm_features_list', { limit: 3 });

await client.close();
console.log('\n[smoke] done');
process.exit(0);
