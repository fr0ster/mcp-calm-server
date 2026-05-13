#!/usr/bin/env node
// One-off probe: can the sandbox accept calm_projects_create?
// If yes — we get a real projectId to feed into listDeliverables /
// listWorkstreams / listTasks / listFeatures round-trips.
import { config as dotenvConfig } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
dotenvConfig({ path: resolve(projectRoot, '.env') });

const { buildCalmClient } = await import('../dist/server/buildClient.js');
const { readConfig } = await import('../dist/server/config.js');
const { createProjectTool } = await import('../dist/tools/projects/createProject.js');
const { listDeliverablesTool } = await import('../dist/tools/tasks/listDeliverables.js');
const { listWorkstreamsTool } = await import('../dist/tools/tasks/listWorkstreams.js');
const { listTasksTool } = await import('../dist/tools/tasks/listTasks.js');

const calm = buildCalmClient(readConfig());
const ctx = { calm };

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const name = `mcp-calm-server probe ${stamp}`;
console.log(`[probe] attempting to create project: "${name}"`);

let project;
try {
  project = await createProjectTool.handler(ctx, {
    name,
    description: 'Automated sandbox probe by mcp-calm-server. Safe to delete.',
  });
  console.log('[probe] create OK:', JSON.stringify(project, null, 2).slice(0, 500));
} catch (err) {
  console.log(`[probe] create FAILED: ${err?.code ?? 'THROW'}  ${err?.message ?? err}`);
  process.exit(1);
}

const id = project?.id;
if (!id) {
  console.log('[probe] create returned object without an `id` field — abort.');
  process.exit(1);
}

console.log(`\n[probe] now exercising tasks/deliverables/workstreams against projectId=${id}\n`);

for (const [name, tool] of [
  ['list_tasks', listTasksTool],
  ['list_deliverables', listDeliverablesTool],
  ['list_workstreams', listWorkstreamsTool],
]) {
  const t0 = Date.now();
  try {
    const res = await tool.handler(ctx, { projectId: id, limit: 3 });
    const ms = Date.now() - t0;
    console.log(`${name.padEnd(20)} OK  ${String(ms).padStart(5)}ms  items=${res.items?.length ?? '?'}  ${JSON.stringify(res).slice(0, 200)}`);
  } catch (err) {
    const ms = Date.now() - t0;
    console.log(`${name.padEnd(20)} ERR ${String(ms).padStart(5)}ms  ${err?.code ?? 'THROW'}  ${err?.message ?? err}`);
  }
}

console.log(`\n[probe] WARNING: created project ${id} stays in your sandbox tenant — calm-client has no deleteProject. Save the id if you want to revisit, or delete via SAP UI if possible.`);
