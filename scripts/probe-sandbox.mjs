#!/usr/bin/env node
// Probe every safe READ tool against the sandbox and print what comes
// back. Calls the tool handlers directly via dist/, so no MCP layer
// involved. Output is { tool, ok, ms, sample } per call — `sample` is
// the first ~250 chars of the JSON response.
import { config as dotenvConfig } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
dotenvConfig({ path: resolve(projectRoot, '.env') });

const { buildCalmClient } = await import('../dist/server/buildClient.js');
const { readConfig } = await import('../dist/server/config.js');

const calm = buildCalmClient(readConfig());
const ctx = { calm };

const tools = [
  // analytics
  ['analytics/listAnalyticsProviders', 'listAnalyticsProvidersTool', {}],
  ['analytics/queryAnalytics', 'queryAnalyticsTool', { endpoint: 'Projects', limit: 3 }],
  // features lookups
  ['features/listFeatureStatuses', 'listFeatureStatusesTool', {}],
  ['features/listFeaturePriorities', 'listFeaturePrioritiesTool', {}],
  ['features/listExternalReferences', 'listExternalReferencesTool', { limit: 3 }],
  // projects
  ['projects/listProjects', 'listProjectsTool', { limit: 3 }],
  ['projects/listPrograms', 'listProgramsTool', { limit: 3 }],
  // documents
  ['documents/listDocuments', 'listDocumentsTool', { limit: 3 }],
  ['documents/listDocumentStatuses', 'listDocumentStatusesTool', {}],
  ['documents/listDocumentTypes', 'listDocumentTypesTool', {}],
  // hierarchy
  ['hierarchy/listHierarchy', 'listHierarchyTool', { limit: 3 }],
  // tasks (no projectId — bonus reads)
  ['tasks/listDeliverables', 'listDeliverablesTool', { limit: 3 }],
  ['tasks/listWorkstreams', 'listWorkstreamsTool', { limit: 3 }],
  // testCases
  ['testCases/listTestCases', 'listTestCasesTool', { limit: 3 }],
  ['testCases/listTestActivities', 'listTestActivitiesTool', { limit: 3 }],
  ['testCases/listTestActions', 'listTestActionsTool', { limit: 3 }],
];

for (const [mod, exp, args] of tools) {
  const t0 = Date.now();
  try {
    const m = await import(`../dist/tools/${mod}.js`);
    const tool = m[exp];
    const res = await tool.handler(ctx, args);
    const ms = Date.now() - t0;
    const json = JSON.stringify(res);
    const sample = json.slice(0, 250);
    const len = Array.isArray(res?.items)
      ? `items=${res.items.length}`
      : Array.isArray(res?.providers)
        ? `providers=${res.providers.length}`
        : Array.isArray(res?.rows)
          ? `rows=${res.rows.length}`
          : 'object';
    console.log(`${tool.toolDefinition.name.padEnd(45)} OK  ${String(ms).padStart(6)}ms  ${len.padEnd(12)} ${sample}`);
  } catch (err) {
    const ms = Date.now() - t0;
    const code = err?.code ?? 'THROW';
    console.log(`${exp.padEnd(45)} ERR ${String(ms).padStart(6)}ms  ${code}  ${err?.message ?? err}`);
  }
}
