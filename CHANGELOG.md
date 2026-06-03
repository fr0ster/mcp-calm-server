# Changelog

## 0.5.1 — 2026-06-03

### Added

- **`calm_logs_get` forwards `category`, `version` and `format`.** The live
  Cloud ALM Logs query supports a domain-specific `category` filter (e.g.
  `category=ABAP Runtime`) plus `version`/`format` knobs. The tool now
  exposes all three in its input schema and forwards them to the client, so
  the full live query
  `/calm-logs/v1/logs?version=V1&period=60M&provider=…&serviceId=…&category=ABAP%20Runtime&format=protobuf-json`
  is expressible. `format` is forwarded as-is rather than assumed inert —
  on the wire the Logs API has so far always answered `application/x-protobuf`
  regardless, and the tool still decodes that into OTLP JSON.
- **`scripts/probe-logs.mjs`** — a direct (client-level) probe that runs the
  full query plus `format`/`category`/`version` variants against a live
  tenant and reports the raw body type/size, so their wire effect can be
  observed instead of guessed.

### Changed

- Realign with `@mcp-abap-adt/calm-client@^0.5.0` (adds the `category`
  param to `IGetLogsParams` / `CalmLog.get()`).

## 0.5.0 — 2026-05-26

### Added

- **`calm_logs_get` now decodes the OTLP response into JSON.** The Cloud
  ALM Logs API returns an OpenTelemetry `application/x-protobuf` body, not
  JSON. The tool decodes it into canonical OTLP JSON under `records`
  (`{ resourceLogs: [{ resource, scopeLogs: [{ scope, logRecords }] }] }`)
  using an embedded minimal OTLP schema (`src/tools/logs/otlpProto.ts`) +
  `protobufjs`. Verified live on tenant `eu10-004`: ABAP Application Log
  records with `service.name`, `sap.exm.*` attributes decode correctly.
- **`calm_logs_get` gains `raw: true`** — returns the undecoded protobuf as
  a base64 string with `encoding: "base64"`, for debugging or forwarding to
  another OTLP consumer.

### Changed

- **The connection returns a `Buffer` for binary responses.**
  `AbstractCalmConnection` previously read every body via `response.text()`,
  which mangled protobuf bytes through UTF-8. It now reads the raw bytes and
  returns a `Buffer` for non-textual Content-Types (e.g.
  `application/x-protobuf`, `application/octet-stream`); JSON/text/XML
  responses are decoded and parsed exactly as before. Response shaping
  (OTLP→JSON) stays in the tool layer — the client remains transport-only.

## 0.4.1 — 2026-05-25

### Changed

- Realign with `@mcp-abap-adt/calm-client@0.4.2`: `calm_logs_get` exposes an
  optional `onLimit` (defaults to `truncate` in the client when
  `limit`/`offset` is set, so paging no longer 403s). Corrected the
  `period` (`<n>M` minutes, not `1h`) and `serviceId` parameter descriptions.

## 0.4.0 — 2026-05-24

Follows `@mcp-abap-adt/calm-client@0.4.0` (connection moved out of the
client). Combines the auth-broker integration (M19) with a
server-owned connection layer.

### Changed (BREAKING)

- **The server now owns the CALM connection.** New
  `src/server/connection/` module on native `fetch`:
  `AbstractCalmConnection`, `SandboxCalmConnection` (api-key),
  `OAuth2CalmConnection` (Bearer via `ITokenRefresher`, one-shot
  refresh+retry on 401/403), and the
  `createCalmConnection(config, overrides?)` factory. Exposed via the
  `./connection` subpath export. `@mcp-abap-adt/calm-client` no longer
  ships `CalmConnection` (peer bumped to `^0.4.0`).
- **`CALM_BASE_URL` is consumed verbatim** — service routes are appended
  by plain concatenation; no `/api` injection. Paste `endpoints.Api`
  from the service-key as-is (it already includes `/api`). Fixes the
  silent double-`/api` 404 against live tenants.

### Added

- **Token acquisition via `@mcp-abap-adt/auth-broker`** (M19):
  `buildCalmClient` is `async`, honours `CALM_AUTH_FLOW`
  (`client_credentials` | `authorization_code`), and sources UAA creds
  from inline `CALM_UAA_*` (legacy shim) or `./{destination}.env`
  (produced by the `mcp-auth` CLI). The broker yields the
  `ITokenRefresher` that is injected into `OAuth2CalmConnection` via the
  factory's `tokenRefresher` override.
- **Request-lifecycle logging** in the connection via an optional
  `ILogger` (debug on request/response/retry, warn on transport
  failure), threaded from `runStdio` through the stderr-safe
  `StderrLogger`.

### Fixed

- `dotenv` moved from `devDependencies` to `dependencies` (imported at
  runtime by `config.ts`).

## 0.3.0 — 2026-05-13

Follows `@mcp-abap-adt/calm-client@0.3.0` (issue / PR #3 / #4 there).
Closes a wider class of the same bug fixed in 0.2.1: every list
endpoint whose Spring controller takes `@RequestParam UUID projectId`
must carry `projectId` on the URL, not in OData `$filter`. After the
earlier deliverables/workstreams fix, two more came out the moment a
sandbox `projectId` became available: `listTasks` and `listFeatures`.

### Changed (BREAKING for two tool input schemas)

- **`calm_features_get_by_display_id`** — `projectId` is now
  `required`. The `getFeatureByDisplayId` endpoint delegates through
  `listFeatures`, which now needs project scope; and the displayId
  itself (`6-123`) is project-scoped anyway, so this matches the
  underlying data model.

### Fixed (internal, no schema impact)

- **`calm_tasks_list` / `calm_features_list`** — projectId is now
  forwarded positionally to the calm-client (not stuffed into
  `$filter`), aligning with the server's `?projectId=<uuid>` URL
  contract.
- **`calm_tasks_list`** — Tasks service rejects every OData query
  parameter (`$select`, `$top`, `$filter` all return 400 "not
  supported yet") despite returning an OData-collection shape. The
  tool now calls `calm.getTasks().list(projectId)` with no query and
  performs status/assignee filtering and limit/offset pagination
  locally. The `fields` arg is kept for API symmetry but accepted as
  a downstream hint only — the full record comes back from the wire.

### Updated

- Peer dependency `@mcp-abap-adt/calm-client` bumped `^0.2.0` →
  `^0.3.0`. Required by the projectId-positional signatures on
  `list` / `getByDisplayId`.

### Discovery / debugging

- The bug was latent until a borrowed sandbox `projectId` (leaked
  through a public `test_case.projectId`) activated the
  `describeWithProject` integration gate. Five tests failed with the
  same HTTP 400 root cause, plus two more Tasks-only "not supported
  yet" 400s on `$select` / `$top`.
- The Tasks service's non-OData nature is now documented in the
  source (and via this entry) — future tools targeting `/tasks/*`
  should not assume OData semantics.

### Tests

- Updated unit tests for `listFeatures` (URL-based projectId, no
  `$filter` for it), `listTasks` (no OData query at all, client-side
  filter), and `getByDisplayId` (projectId+displayId positional args).
- Integration sandbox suite now exercises five project-scoped reads
  end-to-end against a borrowed projectId — 230 passed / 2 skipped
  (oauth2 only) / 1 todo.

## 0.2.1 — 2026-05-13

Same-day follow-up to 0.2.0: realigns two bonus tools with
`@mcp-abap-adt/calm-client@0.2.0`, which corrected its
`listDeliverables` / `listWorkstreams` signatures to require
`projectId` (see calm-client issue #1 / PR #2).

### Changed (BREAKING for two tool input schemas)

- **`calm_tasks_list_deliverables`** — `projectId` is now `required`
  in the input schema. The Tasks service exposes this endpoint with
  `@RequestParam UUID projectId` and rejects calls without it; the
  previous schema treated `projectId` as optional and emitted it as an
  OData `$filter`, which the server ignored (sandbox returned 400,
  live tenant would also 400).
- **`calm_tasks_list_workstreams`** — same change for symmetry and to
  match the corrected client API. Sandbox happened to tolerate the
  missing param and return an empty page, but a real tenant would 400.

### Updated

- Peer dependency `@mcp-abap-adt/calm-client` bumped from `^0.1.0` to
  `^0.2.0`. Required for the corrected method signatures.

### Tests

- Unit tests for the two affected bonus tools rewritten to assert
  `INVALID_ARGUMENT` without `projectId` and positional-`projectId`
  forwarding to the client. 225 passed (was 224), 7 skipped, 1 todo.

## 0.2.0 — 2026-05-13

Parity with the consetto-Rust port plus a wider bonus surface, live
integration coverage, and a logger that is safe to use under MCP
stdio. **54 tools** (was 23), **232 tests** (was 103), full build
green.

### Added

- **Tasks CRUD (M7)** — `create`, `update`, `delete`, `create_comment`.
- **TestCases CRUD (M8)** — `create`, `update`, `delete`, plus nested
  `create_activity` / `create_action`.
- **Documents CRUD (M9)** — `create`, `update`, `delete`.
- **Hierarchy CRUD (M10)** — `create_node`, `update_node`,
  `delete_node`.
- **Feature external references (M11)** —
  `create_external_reference`, `delete_external_reference`.
- **Projects writes (M12)** — `create`.
- **Logs writes (M13)** — `post` (OpenTelemetry-style record
  ingestion).
- **Bonus read tools (M16, +12)** — surface every read method already
  in `calm-client` that consetto-Rust does not expose:
  - `documents.list_statuses`, `documents.list_types`
  - `projects.list_programs`, `projects.get_program`,
    `projects.list_team_members`, `projects.list_timeboxes`
  - `features.list_external_references`
  - `tasks.list_deliverables`, `tasks.list_workstreams`,
    `tasks.list_references`
  - `testCases.list_activities`, `testCases.list_actions`
- **Integration test suite (M14)** under
  `src/__tests__/integration/*.sandbox.test.ts` — one file per service,
  gated on env, runs against the SAP sandbox in CI.
- **Live OAuth2 gates (M17)** —
  `describeWhenLive`, `describeOAuth2`, `describeMutating` alongside
  the existing sandbox gates. Mutation tests are opt-in via
  `CALM_ALLOW_MUTATIONS=1` and always finalise via
  `try/finally { delete }`.
- **`StderrLogger` (M15)** — minimal `ILogger` that routes every level
  to stderr. Wired into `runStdio` so the bin emits lifecycle events
  (start, transport bound, shutdown) without ever touching stdout
  (which MCP-stdio reserves for the JSON-RPC frame stream). The
  family's `PinoLogger` / `DefaultLogger` write `info`/`debug` to
  stdout by default — using either inside a stdio MCP server would
  corrupt every call.
- **`scripts/smoke-sandbox.mjs`** — 30-second smoke check: spawns the
  stdio bin, lists tools, exercises a handful of read endpoints,
  exits non-zero on any unexpected failure.

### Fixed

- `list_hierarchy` and `list_test_cases` no longer ship sandbox-
  incompatible properties in their default `$select`. The sandbox
  OData type does not expose `parentNodeUuid` / `rootNodeUuid` on
  `HierarchyNodes`, nor `statusCode` on `ManualTestCases`; defaults
  returned 400 against the sandbox. Removed from `DEFAULT_FIELDS`;
  callers can still opt in via `fields: [...]` against a tenant that
  exposes them.
- `config.loadEnv` no longer reads the cwd-level `.env` under Jest.
  The config-unit suite assumes a clean env; a developer's local
  sandbox `.env` was silently leaking into it. Smoke scripts and the
  stdio bin load `.env` explicitly via `dotenv` themselves.

### Notes

- All HTTP / OData work lives in `@mcp-abap-adt/calm-client`. This
  package is pure tool-shim: JSON Schema, args validation, error
  mapping. The 19 new mutation tools added in M7–M13 required *zero*
  changes to the client.
- Mutations against the shared SAP sandbox at `api.sap.com` are
  intentionally not exercised by `npm test`; reachability is verified
  via each tool's `INVALID_ARGUMENT` guard. Real ingestion happens
  only under `describeMutating` on an opt-in live backend.

## 0.1.0 — 2026-04-24

First usable release. 23 MCP tools covering all 9 Cloud ALM services,
dual library + runnable-server package, 103 unit tests, full build green.

### Added

- **`BaseCalmMcpServer`** — subclass of `@modelcontextprotocol/sdk`'s
  `McpServer`. Accepts a `CalmClient` + handler groups and registers
  every tool with automatic context injection on each call.
- **`CalmToolRegistry`** + **`HandlerGroup`** — service-scoped tool
  bundling with duplicate detection and JSON Schema → Zod conversion
  at registration time (handler files stay pure).
- **23 MCP tools** across 9 services (see README for the full table).
  All list tools follow the same token-economy contract (compact
  default fields, `limit` capped at 200, `offset`, optional `withCount`).
- **`calm-mcp` bin** — `npx @mcp-abap-adt/calm-server` runs the server
  on stdio. `.env` + standard `CALM_MODE=oauth2|sandbox` config; same
  env shape as `@mcp-abap-adt/calm-client` integration tests.
- **Error mapping** — `CalmApiError` (from calm-client) → `CalmToolError`
  with machine codes (`NOT_FOUND`, `ODATA_ERROR`, `HTTP_ERROR`,
  `NETWORK`, `JSON_PARSE`, `UNKNOWN`, `INVALID_ARGUMENT`).
- **Token-economy helpers** — `clampListLimit`, `toListResponse`,
  `escapeODataString`, `joinAndFilters`. Reusable in downstream tool
  implementations.
- **XSUAA client_credentials refresher** (`XsuaaRefresher` in
  `buildClient.ts`) — minimal standalone-mode auth; production
  consumers can inject their own `ITokenRefresher`.
- **Subpath exports** — `./tools` + `./registry` for composing the
  tool set into a larger MCP server.

### Requires

- `@mcp-abap-adt/calm-client` ^0.1.0 (peer)
- `@mcp-abap-adt/interfaces` ^7.1.0 (peer)
- `@modelcontextprotocol/sdk` ^1.0.0 (peer)
- Node.js ≥ 18

### Notes

- Destructive tools (create/update/delete) shipped for **Features only**;
  other services expose read-only tools in 0.1.0. Full CRUD everywhere
  is planned for a later minor after live-tenant validation.
- No integration tests in this package — the `CalmClient` peer already
  verifies transport-level behavior against live tenants.

## 0.0.1 — planning scaffold (superseded)

- Project scaffolded: package.json, tsconfig, biome, jest, LICENSE, .gitignore.
- PLAN.md drafted with architecture, directory layout, tool surface,
  MCP SDK choice, runtime config pattern, milestones, and open decisions.
