# Changelog

## Unreleased

## 0.9.0 — 2026-09-26

### Changed

- **BREAKING: the auth pipeline moves to the auth-broker 3 family, and out of
  `peerDependencies`.** `auth-broker@^3.0.0` (was `^2.2.0`),
  `auth-providers@^4.2.0` (was `^2.2.1`), `auth-stores@^1.2.3` (was `^1.2.0`)
  and `interfaces-auth-sap@^1.0.1` (was `^1.0.0`) are now regular
  `dependencies`. Measured, not assumed: only `src/server/auth/` imports them —
  `buildAuthBroker` constructs the broker, the providers and the stores at
  runtime — and none of their types reaches a file the `exports` map serves
  (`.`, `./tools`, `./registry`, `./connection`). A peer range told a consumer
  to install and match a pipeline it never touches; under the 3.x family it
  conflicted with the consumer's own tree. The install now holds one copy of
  each contract package.

  **What a consumer must change:** drop `auth-broker`, `auth-providers`,
  `auth-stores` and `interfaces-auth-sap` from your own dependencies if you
  added them only for this package, or move them to the 3.x family versions
  above if you use them yourself.

- **BREAKING: the remaining peers move.** `calm-client@^0.8.0` (was `^0.7.0`)
  and `interfaces-auth@^2.1.0` (was `^1.2.0`). They stay peers, as do
  `interfaces-calm@^1.0.1` and `interfaces-utils@^1.1.0`, because the public
  API names their types: `CalmClient` in `IBaseCalmMcpServerOptions` and the
  handler context, `ICalmConnection` and `ITokenRefresher` in
  `@mcp-abap-adt/calm-server/connection`, `ILogger` throughout — your code and
  this package must share one copy. A caret on 0.x pins the minor, so a
  consumer on `calm-client` 0.7 must move to 0.8.

- **BREAKING: Node.js 22 or 24** — `engines: "^22 || ^24"` (was `>=18.0.0`),
  because `auth-providers` 4 and `auth-broker` 3, now runtime dependencies,
  require it.

- **The `authorization_code` flow refuses an interactive login with
  `LoginRequiredError`** (`code: 'LOGIN_REQUIRED'`), whose message is the
  `mcp-auth` command to run. auth-broker 3 removed `allowBrowserAuth`, which
  this server set to `false` for that flow so that a session without a usable
  refresh token failed fast instead of waiting for a login nobody could see;
  the broker's migration note puts that refusal into the provider's
  authorization strategy, and so does this server (`refuseLogin`). For a
  session with no refresh token nothing changes: the 2.x broker refused it
  (`BROWSER_AUTH_REQUIRED`) before calling the provider. One path does change:
  with a stored refresh token the 2.x broker did call the provider, and if the
  identity provider refused that token the provider could fall back to its
  `browser: 'none'` strategy — print the login URL to stderr and wait on the
  callback port while the tool call hung. That now fails at once with
  `LoginRequiredError`. The provider is built by a factory, which the broker
  seeds with the refresh token and the last token the session holds.

- **`CALM_BASE_URL` is handed to the broker without being written into the
  session.** auth-broker 3 refuses a session with no `serviceUrl`, and the
  `./{destination}.env` `mcp-auth` writes for a Cloud ALM key has none. The
  session store is wrapped in `TargetUrlSessionStore`, which answers
  `CALM_BASE_URL` as the `serviceUrl` on reads and, on writes, keeps whatever
  URL the session already holds — or none. The file gains the new token and
  refresh token, as before, and no `XSUAA_MCP_URL`. The same approach as
  `mcp-abap-adt-proxy`, which answered the same refusal the same way.

- auth-broker 3's other changes reach the server as follows:
  `refreshToken()` — the one the connection calls after a 401 — now always
  obtains a new token instead of returning the cached one it had just been
  refused; provider errors arrive unchanged (by class and `code`) instead of
  rewrapped; the broker no longer copies the client secret into the session.

### Documentation

- README: Node.js 22/24, the corrected peer list and why each is a peer,
  `LoginRequiredError` and what to do about it, the session file the broker
  writes. The library example no longer imports `CalmConnection` from
  `calm-client`, which has not shipped it since 0.4.0; it uses
  `SandboxCalmConnection` from `@mcp-abap-adt/calm-server/connection`.
- CLAUDE.md: why the auth pipeline is a dependency and not a peer, and the two
  things auth-broker 3 made this server's job.

## 0.8.0 — 2026-09-24

### Licence

- **This package is now `GPL-3.0-only`.** It was MIT up to and including 0.7.0,
  and **those versions stay MIT** — a licence change is not retroactive, and
  anyone already using 0.7.0 under MIT keeps that grant for 0.7.0.

  **Why the GPL here and the LGPL elsewhere in this family.** The distinction is
  linking. `interfaces-*`, `adt-clients`, `calm-client`, `auth-*` and
  `header-validator` are libraries: you import them into your own program, and the
  LGPL exists precisely so that doing so puts no licence obligation on your
  program. This is not a library — it is an MCP server, a program you run, the
  same shape as `mcp-abap-adt-proxy`, which went `GPL-3.0-only` in its 3.0.0. What
  the GPL asks is of whoever distributes a modified *server*, not of whoever talks
  to one over stdio.

  `LICENSE` carries the full GPL-3.0 text, replacing the MIT text, and matches
  how the proxy ships it: one file, named in `files`, no separate `COPYING` — that
  pairing belongs to the LGPL packages, where both texts are required.

  **It was missed in the relicensing pass.** Fifteen repositories moved off MIT on
  2026-09-03; this one did not, and the gap only became visible while publishing
  0.7.0 — which therefore went to npm under MIT an hour ago. 0.8.0 is the
  correction, and the version moves because a licence is part of what a release
  says.

## 0.7.0 — 2026-09-24

### Changed

- **The auth pipeline moves to 2.x, and the deleted facade is gone from this tree
  entirely.** `auth-broker@^2.2.0` (was `^1.0.5`), `auth-providers@^2.2.1` (was
  `^1.0.5`), `auth-stores@^1.2.0` (was `^1.0.4`), in `peerDependencies` and
  `devDependencies` both. `npm ls @mcp-abap-adt/interfaces` now prints `(empty)`
  where it printed three copies in 0.6.0 and two after `calm-client@0.7.0`.

- **`browser: 'none'` became `authorization: browserCallbackStrategy({ browser: 'none' })`.**
  `auth-providers` 2.x took the flag off the provider and put it on an injected
  `IAuthorizationStrategy` — **with the same meaning**, which is why this is a
  mechanical change and not a decision about how login works: `'none'` and
  `'headless'` print the authorization URL and wait for the redirect on the local
  callback port; `'auto'`, `'system'`, `'chrome'` and the rest open a browser. This
  server speaks over stdio and has no display, so it prints.

  Read out of the 1.x implementation rather than assumed: `launchBrowser` in
  `auth/browserAuth.js` answers `'none' | 'headless'` by announcing the URL, the
  callback port and how to paste a code from another machine — and returns without
  opening anything. The 2.x `CallbackStrategyOptions` documents the same set.

- **The unit test follows the behaviour rather than the field.** It asserted
  `browser: 'none'` on the provider; that assertion would have vanished with the
  field. It now pins both halves — the strategy is built with `{ browser: 'none' }`
  and the provider receives exactly that strategy — under a name that says what is
  being protected: *authorization_code prints the URL and opens nothing*.

## 0.6.0 — 2026-09-24

### Changed

- **The contracts come from the packages that declare them, not from the deleted
  facade.** `@mcp-abap-adt/interfaces@^7.1.0` is gone from `peerDependencies` and
  `devDependencies`; in its place `@mcp-abap-adt/interfaces-calm@^1.0.1`,
  `-auth@^1.2.0`, `-auth-sap@^1.0.0` and `-utils@^1.1.0`, with
  `@mcp-abap-adt/logger@^0.4.0`. 12 files repointed.

  **The peer range is the part that reaches a consumer.** It told everyone
  installing this server to add `@mcp-abap-adt/interfaces`, and that package is
  deleted as of its 52.0.0 — npm serves 51.0.0 to whoever is pinned to it and
  nothing further ships. The README's install line said the same and now names
  the four packages.

- **`@mcp-abap-adt/calm-client@^0.7.0`** in `peerDependencies` and
  `devDependencies`. 0.7.0 is the release that took that package off the facade —
  its own peer range used to name it, so pointing at anything earlier would have
  handed a consumer the same instruction one step deeper.

- **The rest of the auth pipeline stays where it was**, deliberately:
  `auth-broker@^1.0.5`, `auth-providers@^1.0.5`, `auth-stores@^1.0.4`.

  Those two still carry `@mcp-abap-adt/interfaces` transitively, so this tree
  holds two copies of the deleted facade and will until they are upgraded. That
  upgrade is **not** a range bump: `auth-providers` 2.x replaced
  `browser: 'none'` with an injected `IAuthorizationStrategy`, so
  `src/server/auth/buildBroker.ts` has to choose between `manualPasteStrategy`,
  `externalCodeStrategy` and `browserCallbackStrategy` — a decision about how a
  human logs in to this server, not a mechanical repoint. It is left for its own
  change, with the compiler error recorded rather than guessed at:
  `TS2353: 'browser' does not exist in type 'AuthorizationCodeProviderConfig'`.

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
