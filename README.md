# @mcp-abap-adt/calm-server

[![Stand With Ukraine](https://raw.githubusercontent.com/vshymanskyy/StandWithUkraine/main/badges/StandWithUkraine.svg)](https://stand-with-ukraine.pp.ua)

MCP server for **SAP Cloud ALM**, built on
[`@mcp-abap-adt/calm-client`](https://github.com/fr0ster/mcp-calm-client).
Ships **54 MCP tools** covering all 9 Cloud ALM services — full CRUD
where the service supports it, plus a wide read surface — with rich
JSON Schema descriptions that let an LLM plan multi-step workflows.

This package is **dual-purpose**:

- **Runnable stdio server** — `npx @mcp-abap-adt/calm-server`. Plug
  directly into Claude Desktop, Claude Code, or any MCP-compatible host.
- **Reusable library of tool primitives** — import individual tools
  (`FEATURES_GROUP`, `TASKS_GROUP`, …) and embed them in a larger
  composed MCP server without reimplementing anything.

## Status

**0.2.0** — 54 tools, 232 tests (224 unit + integration, 7 env-gated
skips, 1 todo), full build green. Integration suite runs live against
the SAP sandbox (api.sap.com) or any OAuth2 Cloud ALM tenant with a
single `.env` switch; gates skip cleanly when no backend is wired.

## Installation

### As a standalone MCP server

```bash
npm install -g @mcp-abap-adt/calm-server
# or per-project:
npm install @mcp-abap-adt/calm-server
```

### As a library (compose into your own MCP server)

```bash
npm install @mcp-abap-adt/calm-server
# peers:
npm install @mcp-abap-adt/calm-client @mcp-abap-adt/interfaces @modelcontextprotocol/sdk
```

## Standalone: running the server

### 1. Configure credentials

Copy the template and fill in:

```bash
cp .env.example .env
```

**OAuth2 mode (real tenant)** — paste values from an XSUAA service key:

```env
CALM_MODE=oauth2
CALM_BASE_URL=https://<tenant>.<region>.alm.cloud.sap
CALM_UAA_URL=https://<tenant>.authentication.<region>.hana.ondemand.com
CALM_UAA_CLIENT_ID=sb-…!b…|calm!b…
CALM_UAA_CLIENT_SECRET=…
```

**Sandbox mode (SAP API Business Hub)**:

```env
CALM_MODE=sandbox
CALM_API_KEY=<your-key-from-api.sap.com>
# CALM_BASE_URL defaults to https://sandbox.api.sap.com/SAPCALM
```

### 2. Launch

```bash
# Global install:
calm-mcp
# Or via npx without install:
npx @mcp-abap-adt/calm-server
# Or from a clone:
npm run build && node dist/bin/stdio.js
```

The server speaks MCP over stdio. Misconfiguration is reported to
`stderr` with a non-zero exit code.

## Authentication setup

`calm-mcp` supports two OAuth2 flows for live tenants, selectable via
`CALM_AUTH_FLOW`:

| Flow | Use case | Browser? | Refresh token? |
|---|---|---|---|
| `client_credentials` (default) | technical service-binding (`sb-*` client) | no | no |
| `authorization_code` | end-user dev workflow, full user scope | once | yes |

### Option A — quick CC setup (technical user)

Plain `.env` with inline `CALM_UAA_URL` / `CALM_UAA_CLIENT_ID` /
`CALM_UAA_CLIENT_SECRET` works as before — no extra steps. The broker uses
an in-memory session shim for these inline creds.

### Option B — broker-backed setup (CC or AC)

Use the bundled [`mcp-auth`](https://www.npmjs.com/package/@mcp-abap-adt/auth-broker)
CLI to convert a BTP service key into a token-bearing `.env`:

```bash
# CC (no browser)
npx mcp-auth --service-key ./sk.json --output ./DEFAULT.env \
             --type xsuaa --credential

# AC (browser pops once; refresh_token persists)
npx mcp-auth --service-key ./sk.json --output ./DEFAULT.env \
             --type xsuaa --browser auto
```

Then in your `.env`:

```
CALM_MODE=oauth2
CALM_BASE_URL=https://<tenant>.<region>.alm.cloud.sap
CALM_AUTH_FLOW=authorization_code   # or client_credentials
CALM_DESTINATION=DEFAULT
```

The server's runtime auth pipeline is `@mcp-abap-adt/auth-broker`.

> Note: `buildCalmClient` is async since v0.4.0 (was sync in v0.3.x). Library
> consumers must `await` it.

### 3. Wire into Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`
on macOS, `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "calm": {
      "command": "npx",
      "args": ["-y", "@mcp-abap-adt/calm-server"],
      "env": {
        "CALM_MODE": "sandbox",
        "CALM_API_KEY": "<your-sandbox-key>"
      }
    }
  }
}
```

Restart Claude Desktop; the 54 `calm_*` tools become available to the
model.

## Library: composing into another MCP server

Useful when you want to expose Cloud ALM tools alongside ADT tools,
Reports tools, or your own domain tools in a single MCP process.

```ts
import { CalmClient, CalmConnection } from '@mcp-abap-adt/calm-client';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  ALL_GROUPS,
  BaseCalmMcpServer,
  CalmToolRegistry,
  FEATURES_GROUP,
  TASKS_GROUP,
} from '@mcp-abap-adt/calm-server';

// Option A — BaseCalmMcpServer with a curated subset
const calm = new CalmClient(
  new CalmConnection({ baseUrl, apiKey }),
);
const server = new BaseCalmMcpServer({
  name: 'my-mcp',
  version: '1.0.0',
  calm,
  groups: [FEATURES_GROUP, TASKS_GROUP], // only these land as tools
});

// Option B — embed into your existing McpServer
const existing = new McpServer({ name: 'combined', version: '1.0.0' });
const registry = new CalmToolRegistry([...ALL_GROUPS]);
registry.registerAll(existing, () => ({ calm }));
// Now `existing` serves Cloud ALM tools + whatever else you registered.
```

Subpath exports:

```ts
import { ALL_GROUPS } from '@mcp-abap-adt/calm-server/tools';
import { CalmToolRegistry } from '@mcp-abap-adt/calm-server/registry';
```

## Tool surface (54 tools across 9 services)

| Service | Tools |
|---|---|
| **Features** (11) | `list`, `get`, `get_by_display_id`, `create`, `update`, `delete`, `create_external_reference`, `delete_external_reference`, `list_external_references`, `list_statuses`, `list_priorities` |
| **Tasks** (10) | `list`, `get`, `create`, `update`, `delete`, `list_comments`, `create_comment`, `list_references`, `list_deliverables`, `list_workstreams` |
| **TestCases** (9) | `list`, `get`, `create`, `update`, `delete`, `create_activity`, `create_action`, `list_activities`, `list_actions` |
| **Documents** (7) | `list`, `get`, `create`, `update`, `delete`, `list_statuses`, `list_types` |
| **Projects** (7) | `list`, `get`, `create`, `list_programs`, `get_program`, `list_team_members`, `list_timeboxes` |
| **Hierarchy** (5) | `list`, `get_with_children`, `create_node`, `update_node`, `delete_node` |
| **Analytics** (2, read-only) | `query` (17 endpoints), `list_providers` (static catalog) |
| **Logs** (2, domain-specific REST) | `get` (provider + serviceId + time window), `post` (inbound log records) |
| **ProcessMonitoring** (1, read-only) | `list_processes` |

Every MCP tool:
- Has a full JSON Schema with descriptions — the LLM reads these to plan.
- Wraps arguments into OData `$filter` / `$select` / `$top` / `$skip`
  internally — the LLM never sees raw OData syntax.
- Returns compact records by default (`limit=20`, `fields` default ≈ 6
  columns per entity); callers opt into more via `fields`, `limit`,
  `withCount`, `offset`.
- Maps `CalmApiError` → a typed MCP error the LLM can branch on
  (`NOT_FOUND`, `NETWORK`, `ODATA_ERROR` with `serviceCode`, …).

See `src/tools/<service>/*.ts` for per-tool argument schemas.

## Destructive tools (write operations)

Every Cloud ALM service that supports writes is now exposed:

- **Features**: `create`, `update`, `delete`, plus external-reference
  `create` / `delete`
- **Tasks**: `create`, `update`, `delete`, `create_comment`
- **TestCases**: `create`, `update`, `delete`, plus nested
  `create_activity` / `create_action`
- **Documents**: `create`, `update`, `delete`
- **Hierarchy**: `create_node`, `update_node`, `delete_node`
- **Projects**: `create`
- **Logs**: `post` (inbound OpenTelemetry-style record ingestion)

The shared SAP sandbox at `api.sap.com` is read-friendly only — mutation
integration tests are opt-in (see Live-tenant integration below).

## Debug logging

```bash
CALM_LOG_LEVEL=debug         # error | warn | info | debug
DEBUG_CALM_CONNECTORS=true   # CalmConnection retries, 401 refresh, URLs
DEBUG_CALM_LIBS=true         # resource-client internals
DEBUG_CALM_TESTS=true        # test execution progress
```

Logging goes to stderr (stdout is reserved for the MCP protocol stream).

## Development

```bash
git clone git@github.com:fr0ster/mcp-calm-server.git
cd mcp-calm-server
npm install

npm run test           # 224 unit + integration tests
npm run build          # emits dist/, includes executable bin
npm run lint:check     # biome
```

### Live-tenant integration

`src/__tests__/integration/` runs against a real backend when env is
present, and skips cleanly when it isn't (so `npm test` without secrets
is always green). Five gates, drop them into `.env`:

| Gate | Env trigger | What it unlocks |
|---|---|---|
| `describeSandbox` | `CALM_MODE=sandbox` + `CALM_API_KEY` | The `api.sap.com` sandbox |
| `describeOAuth2` | `CALM_MODE=oauth2` + `CALM_BASE_URL` + 3× UAA env | Live tenant (incl. endpoints absent from the sandbox catalog, e.g. Business Processes) |
| `describeWhenLive` | either of the above | Read-side tests that work in either mode |
| `describeWithProject` | live backend + `CALM_PROJECT_ID` | Project-scoped chains (features list→get, tasks list→get→comments, …) |
| `describeMutating` | live + `CALM_PROJECT_ID` + `CALM_ALLOW_MUTATIONS=1` | Write tests (every mutation finalises via `try/finally { delete }`) |

A quick smoke script lives at `scripts/smoke-sandbox.mjs` — spawns the
stdio bin, lists tools, calls a handful of read endpoints, and exits
1 on any non-skip failure.

## License

MIT — see [LICENSE](LICENSE).
