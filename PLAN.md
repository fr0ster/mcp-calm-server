# Development Plan: `@mcp-abap-adt/calm-server`

MCP server for SAP Cloud ALM, built on `@mcp-abap-adt/calm-client`. Designed
as **dual-purpose**: runnable stdio server **and** reusable library of
tool primitives that other MCP servers can embed.

## Motivation

The client library (`mcp-calm-client`) already exposes all 9 Cloud ALM
services through a typed factory (`CalmClient`). An LLM orchestrator
interacting via MCP cannot consume those TypeScript methods directly — it
needs **MCP tools** with JSON schemas, parameter descriptions, and
bounded, token-economical responses. This package is that adapter layer.

Additionally, architecture follows the existing ecosystem pattern seen in
`@mcp-abap-adt/core` (ADT MCP server): MCP packages expose both a
runnable server **and** their individual handlers / tool primitives via
subpath exports, so that larger composed MCP servers can pick and mix
tools from multiple sources.

## Design principles

1. **LLM-first, not function-first.** Tools are designed for an LLM to
   discover, plan with, and compose — not as 1:1 wrappers over
   `CalmClient` methods. A curated surface of 15–25 well-described tools
   is better than 80 thin wrappers.
2. **Composable primitives, not monolithic reports.** No
   `generate_project_status_report` mega-tool. Instead: list, get,
   filter, select — the LLM orchestrates, often combined with tools from
   `@mcp-abap-adt/reports-server`.
3. **Token economy is a first-class concern.** Every list tool:
   - Caps response size with a `limit` (default ~20, max ~200).
   - Supports `fields: string[]` → OData `$select` to trim unused columns.
   - Supports `offset` / pagination so the LLM can fetch more on demand.
   - Never returns raw `@odata.*` metadata to the LLM except `count` when
     requested.
4. **Interface isolation preserved.** Tools depend on `ICalmConnection`
   (via `CalmClient`), not on concrete `CalmConnection`. Consumers inject
   a configured `CalmClient` — this package neither creates connections
   nor talks to XSUAA itself.
5. **Dual export.** `main: dist/index.js` for library consumers, `bin:
   calm-mcp` for standalone execution. Subpath exports (`./tools`,
   `./registry`) let other MCP packages import individual tool sets.
6. **Errors are user-facing messages + machine codes.** `CalmApiError` →
   MCP error response: user gets a clean message, LLM gets the typed
   `code` for retry/branch decisions. `NOT_FOUND` → friendly "Feature
   not found", `NETWORK` → "Cloud ALM unreachable, retrying…",
   `ODATA_ERROR` → raw service code for developer diagnostics.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ LLM (via MCP protocol)                                          │
└─────────────────────────────────────────────────────────────────┘
                           │ tool calls
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ calm-mcp stdio/SSE server                                       │
│   BaseMcpServer (extends @modelcontextprotocol/sdk McpServer)   │
│     - HandlerContext { calm: CalmClient, logger: ILogger }      │
│     - CalmToolRegistry binds handlers → tools                   │
└─────────────────────────────────────────────────────────────────┘
                           │ handler(calm, params)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ Tool primitives (src/tools/*)                                   │
│   - Pure async functions                                        │
│   - JSON schema for params                                      │
│   - Description + examples for LLM                              │
│   - Exportable individually for reuse in other MCPs             │
└─────────────────────────────────────────────────────────────────┘
                           │ CalmClient API
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│ @mcp-abap-adt/calm-client  (peer)                               │
│   CalmFeature / CalmDocument / …  ICalmConnection               │
└─────────────────────────────────────────────────────────────────┘
```

## Directory layout

```
src/
  tools/
    features/
      listFeatures.ts          ← { name, inputSchema, handler }
      getFeature.ts
      createFeature.ts
      updateFeature.ts
      deleteFeature.ts
      getFeatureByDisplayId.ts
      listFeatureExternalRefs.ts
      listFeatureStatuses.ts
      listFeaturePriorities.ts
      index.ts                 ← FEATURE_TOOLS = [...]
    documents/
    testCases/
    hierarchy/
    analytics/
    processMonitoring/
    tasks/
    projects/
    logs/
    index.ts                   ← ALL_TOOLS = [...FEATURE_TOOLS, …]
  registry/
    types.ts                   ← ICalmTool, HandlerContext, IToolBinding
    CalmToolRegistry.ts        ← binds handler → MCP tool on server
    index.ts
  server/
    CalmMcpServer.ts           ← extends McpServer; wires auth + registry
    config.ts                  ← reads env / config file
    index.ts
  bin/
    stdio.ts                   ← shebang entry: runs CalmMcpServer on stdio
  utils/
    tokenEconomy.ts            ← response trimming helpers
    errorMapping.ts            ← CalmApiError → MCP error
  __tests__/
    unit/
    integration/
  index.ts                     ← public lib API
```

## Tool shape (the reusable primitive)

```ts
// src/registry/types.ts
import type { CalmClient } from '@mcp-abap-adt/calm-client';
import type { ILogger } from '@mcp-abap-adt/interfaces';

export interface ICalmToolContext {
  calm: CalmClient;
  logger?: ILogger;
}

export interface ICalmTool<TParams = unknown, TResult = unknown> {
  name: string;                            // MCP-unique, namespaced: "calm_features_list"
  description: string;                     // LLM-readable; explain when to use it
  inputSchema: object;                     // JSON Schema (draft 07)
  handler: (ctx: ICalmToolContext, params: TParams) => Promise<TResult>;
}
```

A handler knows nothing about MCP transport — it's a pure async function.
`CalmToolRegistry` wraps handlers with MCP-server-specific concerns
(JSON-schema → Zod, error mapping, logging).

## Initial tool surface (planning target — ~22 tools)

| Tool | Wraps | Purpose |
|---|---|---|
| `calm_features_list` | `CalmFeature.list` | Filtered list by project / status / priority |
| `calm_features_get` | `.get(uuid)` | Single feature by UUID |
| `calm_features_get_by_display_id` | `.getByDisplayId` | Human-facing "6-123" lookup |
| `calm_features_create` | `.create` | Write (destructive) |
| `calm_features_update` | `.update` | Write (destructive) |
| `calm_features_delete` | `.delete` | Destructive |
| `calm_features_list_statuses` | `.listStatuses` | Lookup |
| `calm_features_list_priorities` | `.listPriorities` | Lookup |
| `calm_documents_list` | `CalmDocument.list` | |
| `calm_documents_get` | `.get` | |
| `calm_tasks_list` | `CalmTask.list` | Primary — project tasks |
| `calm_tasks_get` | `.get` | |
| `calm_tasks_list_comments` | `.listComments` | |
| `calm_projects_list` | `CalmProject.list` | |
| `calm_projects_get` | `.get` | |
| `calm_hierarchy_list` | `CalmHierarchy.list` | |
| `calm_hierarchy_get_with_children` | `.getWithExpand(uuid, ['toChildNodes'])` | Common expand |
| `calm_test_cases_list` | `CalmTestCase.list` | |
| `calm_test_cases_get` | `.get` | |
| `calm_analytics_query` | `CalmAnalytics.getEndpoint` | Pre-aggregated datasets |
| `calm_analytics_list_providers` | `.listProviders` | Static — no network |
| `calm_process_monitoring_list_processes` | `CalmProcessMonitoring.listBusinessProcesses` | |
| `calm_logs_get` | `CalmLog.get` | Diagnostic |

Not initial (may be added):
- Create/update/delete for non-feature resources — add once destructive
  flow is validated against a tenant.
- Nested sub-entity CRUD (externalReferences, activities, actions) — add
  if LLM use-cases emerge.
- Process Monitoring detail-by-id getters — add with fixture data.

## MCP SDK

Using `@modelcontextprotocol/sdk` (official TS SDK), same as
`@mcp-abap-adt/core`. `BaseMcpServer` subclass pattern is mirrored to
keep ecosystem consistent.

## Runtime config (standalone mode)

`.env` pattern, identical to `@mcp-abap-adt/calm-client` tests — so
developers who configured their tenant for integration tests get the
standalone server working with zero extra setup:

```
CALM_MODE=oauth2|sandbox
CALM_BASE_URL=…
CALM_UAA_URL=…
CALM_UAA_CLIENT_ID=…
CALM_UAA_CLIENT_SECRET=…
CALM_API_KEY=…            # sandbox only
CALM_LOG_LEVEL=info
DEBUG_CALM_CONNECTORS=true
```

`src/server/config.ts` parses env → builds `CalmConnection` →
`CalmClient` → feeds `CalmMcpServer`.

## Open decisions

1. **Shared tool-contract in `@mcp-abap-adt/interfaces`?** If ADT MCP
   exports a compatible `IAdtTool`/`IMcpTool`, move `ICalmTool` into
   interfaces as a generic `IMcpTool<TContext, TParams, TResult>` to
   unify. Decide after inspecting ADT's current exports.
2. **Transport beyond stdio?** Start with stdio only. SSE/HTTP can be
   added later via a second bin entry. Not blocking.
3. **Zod vs raw JSON Schema?** MCP SDK accepts both. Start with raw
   JSON Schema (tools are plain objects, no runtime parsing concerns)
   and convert via `jsonSchemaToZod` inside the registry — matches ADT
   MCP pattern.
4. **Filter DSL for LLM?** Current plan: named params that the tool
   translates into OData `$filter` internally. Do not expose OData
   syntax to the LLM — it's error-prone and burns tokens. Decide
   per-tool if arbitrary-filter escape hatch is needed (probably a
   small minority).

## Milestones

| # | Milestone | Criteria |
|---|---|---|
| M1 | Scaffold + contract | package.json, tsconfig, `ICalmTool` in registry, empty tool modules, CI green on unit tests (=0). |
| M2 | First tool + registry | `calm_features_list` + `CalmToolRegistry` + `BaseMcpServer` subclass + unit tests (mock `CalmClient`). |
| M3 | Feature tool set | All 8 feature tools, unit tests covering param → OData translation and response trimming. |
| M4 | Remaining services | Tools for documents/tasks/projects/hierarchy/testCases/analytics/procMon/logs. |
| M5 | Standalone server | `bin/stdio.ts`, config loader, end-to-end integration test against a live tenant via `.env`. |
| M6 | 0.1.0 release | README, usage examples for both runnable + library modes, CHANGELOG, npm publish. |

## Non-goals (explicit)

- **Report generation** — lives in `@mcp-abap-adt/reports-server`, not here.
- **Cross-service joins** — LLM composes results from multiple calls; no
  joining done in this package.
- **Caching / ETL** — out of scope for 0.x. A later `calm-cache` package
  could sit between client and server if perf becomes critical.
- **Custom OData expressions from LLM** — tools translate typed params;
  arbitrary `$filter` strings opened only on a per-tool basis with
  strong safeguards.
