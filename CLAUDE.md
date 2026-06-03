# Guidance for Claude / AI agents working on `mcp-calm-server`

Project context that isn't obvious from the code or git history.
Read this before non-trivial changes — it documents hidden contracts,
known pitfalls, and a few hard-won facts about the upstream SAP API.

## Architecture (one-line)

```
mcp-calm-client  ──HTTP/OData──>  SAP Cloud ALM
       ▲
       │ ICalmConnection, ILogger, ODataQuery (from @mcp-abap-adt/interfaces)
       │
mcp-calm-server  ──MCP/stdio──>  Claude Desktop / Code / any MCP host
```

- **`@mcp-abap-adt/calm-client`** — HTTP, OData, types, retries, error
  translation. Lives at `~/prj/mcp-calm-client`.
- **`@mcp-abap-adt/calm-server`** (this repo) — tool-shim: JSON Schema,
  args validation, error mapping, MCP registry. Should **never** do
  raw HTTP itself — if a client method is missing, fix it in
  calm-client first.

When a tool needs a new HTTP capability: add it to calm-client, cut a
release there, bump the peer dep here, then wire the tool. Doing it
the other way produces hidden direct-HTTP code that doesn't go
through the auth/retry/error pipeline.

## Critical pitfall: MCP-stdio reserves stdout

MCP over stdio uses **stdout for JSON-RPC frames**. Any other write
to stdout silently corrupts every protocol call.

- Family loggers (`@mcp-abap-adt/logger` → `PinoLogger`,
  `DefaultLogger`) write `info`/`debug` to **stdout** by default.
  **Do not use them inside the stdio bin.** A local `StderrLogger`
  (`src/server/stderrLogger.ts`) routes every level to stderr — use
  it for any stdio runtime path.
- For library consumers wiring `BaseCalmMcpServer` over HTTP / SSE /
  custom transports, the family loggers are fine — the
  stdout-collision concern doesn't apply.
- The `StderrLogger.test.ts` includes a guard that fails if anything
  ever hits stdout. Keep it green.

## Critical pitfall: CALM_BASE_URL is consumed verbatim

The connection layer (`src/server/connection/`) appends service routes
to `CALM_BASE_URL` by plain concatenation — it does **not** inject
`/api`. A tenant service-key's `endpoints.Api` already includes `/api`
(e.g. `https://eu10-004.alm.cloud.sap/api`); copy it 1:1 into
`CALM_BASE_URL`. Sandbox uses `https://sandbox.api.sap.com/SAPCALM` as
before. A bare host (no `/api`) in OAuth2 mode yields 404 on every call.

Connection construction lives in `src/server/connection/` (factory
`createCalmConnection`), not in `@mcp-abap-adt/calm-client` — the client
ships only the API surface and depends on the `ICalmConnection`
interface. Tokens come from `@mcp-abap-adt/auth-broker` (see
`auth/buildBroker.ts`), injected into the connection as an
`ITokenRefresher`.

## Critical pitfall: Logs default to OTLP protobuf (but `format=protobuf-json` flips to JSON)

`/calm-logs/v1/logs` (GET) responds `application/x-protobuf` by default —
an OpenTelemetry `ExportLogsServiceRequest`. **The `format` query param is
NOT ignored**, contrary to what this note used to claim: the specific value
`format=protobuf-json` switches the wire response to `application/json`
carrying the *same* `{ resourceLogs: [...] }` OTLP shape. Other values
(`format=json`, or omitting `format`) → protobuf. Verified live on tenant
`eu10-004`, window `provider=exm.im / serviceId=… / category=ABAP Runtime`,
2026-06-04 (see `scripts/probe-logs.mjs`): on a non-empty window,
`format=protobuf-json` → JSON object with `resourceLogs`, `no format` /
`format=json` → a 15 408-byte protobuf `Buffer`. (On an *empty* window the
server returns a JSON `{}` only when `format=protobuf-json` is set;
otherwise an empty body.)

Consequences baked into the code:

- `AbstractCalmConnection` returns a **`Buffer`** for non-textual
  Content-Types (reading the body as `response.text()` would mangle the
  bytes via UTF-8). JSON/text/XML responses still parse as before — so a
  `format=protobuf-json` response arrives as an already-parsed object.
- **Response shaping lives in the tool, not the client.** `listTasksTool`
  filters client-side; `getLogsTool` handles BOTH wire encodings: a
  `Buffer`/`Uint8Array` is decoded into canonical OTLP JSON via an embedded
  minimal schema (`src/tools/logs/otlpProto.ts`) + `protobufjs`
  (`src/tools/logs/otlpLogs.ts`); a non-binary body (the JSON object, or an
  empty `{}`) is passed through unchanged. Either way `records` ends up as
  the same `{ resourceLogs: [...] }`. The client stays transport-only.
- `getLogsTool` / `CalmLog.get()` forward these query params verbatim:
  `provider` (required), `serviceId`, `category`, `version`, `format`,
  `from`, `to`, `period`, `limit`, `offset`, `onLimit`. `category` is a
  **load-bearing filter** — dropping it on a busy window overflows the
  server count cap (`FORBIDDEN — Response total count is over the limit`).
- Time window quirks: `period` is `<n>M` **minutes** (not `1h`) and is
  **capped at 60** — `period` > 60 → `400 BAD_REQUEST "Time interval > 60
  mins"`. `from`/`to` must be formatted **`YYYYMMDDHHmmss`** (UTC), NOT ISO
  — an ISO timestamp returns `400 "From is not of format YYYYMMDDHHmmss"`.
- Logs paging is non-standard: `limit`/`offset` only work alongside
  `onLimit=truncate` (the client defaults it); `top/$top/pageSize/page`
  → 400 "Unknown filter".

## Critical pitfall: parts of SAP Cloud ALM are NOT OData

Several endpoints look like OData (return `IODataCollection<T>`) but
**do not implement OData query semantics**. The Tasks service is the
worst offender:

| Endpoint | `?projectId=` | `$filter` | `$select` | `$top` / `$skip` |
|---|---|---|---|---|
| `/tasks`           | required | 400 "not supported yet" | 400 | 400 |
| `/Features`        | required | ✅ ok | ✅ ok | ✅ ok |
| `/deliverables`    | required | (unverified) | (unverified) | (unverified) |
| `/workstreams`     | required | (unverified) | (unverified) | (unverified) |
| `/Documents`, `/ManualTestCases`, `/HierarchyNodes`, `/Activities`, `/Actions`, `/ExternalReferences`, `/projects`, `/programs` | n/a (global) | ✅ | ✅ | ✅ |

Rules of thumb when adding new tools:

1. If the endpoint is a Spring controller with
   `@RequestParam UUID projectId`, the param goes on the URL
   (`?projectId=<uuid>`), **not** into `$filter`. The
   `odataAfterProjectId(query)` helper at
   `mcp-calm-client/src/core/_internal/url.ts` is the canonical way
   to layer an OData query after.
2. **Never assume** OData semantics on a `/tasks/*` route — the
   response envelope is OData-shaped, the request contract is not.
   `listTasksTool` (`src/tools/tasks/listTasks.ts`) implements the
   workaround pattern: call `calm.getTasks().list(projectId)` with no
   query, do filtering + pagination client-side. Reuse this pattern
   for any other `/tasks/*` list tool.
3. Field validation: the sandbox schema is **narrower** than the live
   tenant schema for some entity types. `HierarchyNodes` doesn't
   expose `parentNodeUuid` / `rootNodeUuid`; `ManualTestCases`
   doesn't expose `statusCode`. Keep these out of `DEFAULT_FIELDS`
   but allow them in `ALLOWED_FIELDS` for opt-in via `fields: [...]`.
4. GUIDs in OData filters on this service are **unquoted** —
   `projectId eq <uuid>`, NOT `projectId eq '<uuid>'`. The
   single-quoted form returns a type-mismatch error.

## Integration test gates

`src/__tests__/integration/_sandbox.ts` exposes five env-driven gates.
`npm test` without secrets stays green; provide env to unlock
coverage.

| Gate | Env trigger | What it unlocks |
|---|---|---|
| `describeSandbox` | `CALM_MODE=sandbox` + `CALM_API_KEY` | api.sap.com sandbox |
| `describeOAuth2` | `CALM_MODE=oauth2` + `CALM_BASE_URL` + 3× UAA env | Live tenant (incl. endpoints absent from sandbox) |
| `describeWhenLive` | either of the above | Read-side tests that work in either mode |
| `describeWithProject` | live + `CALM_PROJECT_ID` | Project-scoped chains |
| `describeMutating` | live + `CALM_PROJECT_ID` + `CALM_ALLOW_MUTATIONS=1` | Write tests (always finalise via `try/finally { delete }`) |

### Sandbox `CALM_PROJECT_ID` trick

The api.sap.com sandbox leaks a SAP-internal demo `projectId` through
`/ManualTestCases` (the projectId field on a public read response).
You can copy that id into `.env` to activate the `describeWithProject`
gate locally without owning a tenant. Mutations still 403; URL-param
ownership-checked routes (`deliverables`, `workstreams`) likely
403/404 too.

Recipe:

```env
CALM_MODE=sandbox
CALM_API_KEY=<your-api.sap.com-S-user-key>
CALM_PROJECT_ID=3532c9fd-09e3-488b-b882-a85d1b807f7e
CALM_TIMEOUT=60000
```

`CALM_TIMEOUT=60000` is important — sandbox `/projects` regularly
takes 25–28 s, the 30 s default is on the edge and produces flaky
tests.

## Dev workflow

```bash
npm install              # one-time
npm run lint             # biome --write
npm run build            # biome check + tsc (also blocks on lint errors)
npm test                 # jest unit + integration (env-gated)
node scripts/smoke-sandbox.mjs   # quick end-to-end stdio probe
node scripts/probe-sandbox.mjs   # direct-handler probe (faster, no MCP layer)
```

### Commit / release rhythm

Long-running work is split into **milestones**, one commit each, in
the `feat(MN): ...` style. Examples in `git log`: `feat(M7)`,
`feat(M14)`, `release(M18)`. Each milestone:

1. Code change + tests.
2. `npm run lint` + `npm run build` + `npm test` all green.
3. Single commit with a descriptive body that records WHY, not just
   WHAT.

`gh pr create` only when working in a separate branch — this repo
mostly merges direct to `main`. `gh release create` goes after
`npm publish` (which the maintainer runs by hand; AI agents should
not run `npm publish`).

## Comparison with the consetto Rust port

`consetto/sap-cloud-alm-odata-mcp` (Rust) is the public reference
implementation referenced in
[Davinder Pal's article](https://www.linkedin.com/pulse/). This TS
project hit feature parity with consetto in v0.2.0 and surpassed it
in v0.2.0+ with 12 bonus read tools.

Notable differences:
- TS surface is **curated**: ~54 tools across 9 services, each with a
  rich JSON Schema for LLM planning. Consetto exposes ~75+ thinner
  tools mapping 1:1 to OData endpoints.
- Distribution: `npx @mcp-abap-adt/calm-server` (this repo) vs
  `cargo build --release` (consetto).
- Library mode: this repo is dual-purpose — runnable stdio bin AND
  reusable tool primitives (`FEATURES_GROUP`, `TASKS_GROUP`, …) for
  composition into a larger MCP server. Consetto is standalone-only.

## Out of scope for AI agents

- `npm publish` — maintainer runs by hand with their npm credentials.
- `git push --force` to `main` — never.
- Editing `~/.claude/` (user's personal Claude config) — that belongs
  to the user.
- Touching `mcp-calm-client` from this repo's working copy without
  explicit ask. The two are separate npm packages with their own
  release cycle; cross-repo edits should always come with an
  upstream issue + PR in `mcp-calm-client` first.
