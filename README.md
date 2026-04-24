# @mcp-abap-adt/calm-server

[![Stand With Ukraine](https://raw.githubusercontent.com/vshymanskyy/StandWithUkraine/main/badges/StandWithUkraine.svg)](https://stand-with-ukraine.pp.ua)

MCP server for **SAP Cloud ALM**, built on
[`@mcp-abap-adt/calm-client`](https://github.com/fr0ster/mcp-calm-client).
Ships 23 MCP tools covering all 9 Cloud ALM services, with rich JSON
Schema descriptions that let an LLM plan multi-step workflows.

This package is **dual-purpose**:

- **Runnable stdio server** — `npx @mcp-abap-adt/calm-server`. Plug
  directly into Claude Desktop, Claude Code, or any MCP-compatible host.
- **Reusable library of tool primitives** — import individual tools
  (`FEATURES_GROUP`, `TASKS_GROUP`, …) and embed them in a larger
  composed MCP server without reimplementing anything.

## Status

**0.1.0** — 23 tools, 103 unit tests, full build green. Integration
against a live Cloud ALM tenant/sandbox is driven by the host — no
server-side credential storage beyond the standalone `.env`.

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

Restart Claude Desktop; the 23 `calm_*` tools become available to the
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

## Tool surface (23 tools across 9 services)

| Service | Tools |
|---|---|
| **Features** (8) | `list`, `get`, `get_by_display_id`, `create`, `update`, `delete`, `list_statuses`, `list_priorities` |
| **Documents** (2) | `list`, `get` |
| **TestCases** (2) | `list`, `get` |
| **Hierarchy** (2) | `list`, `get_with_children` (default `$expand=[toChildNodes, toParentNode]`) |
| **Analytics** (2, read-only) | `query` (17 endpoints), `list_providers` (static catalog) |
| **ProcessMonitoring** (1, read-only) | `list_processes` |
| **Tasks** (3) | `list`, `get`, `list_comments` |
| **Projects** (2) | `list`, `get` |
| **Logs** (1, domain-specific REST) | `get` (provider + serviceId + time window) |

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

Currently only **Features** exposes `create` / `update` / `delete`. For
the other 8 services, destructive tools are deferred to a future minor
release — they require live-tenant validation before the patterns are
promoted. If you need them earlier, open an issue or contribute via the
per-service handler modules; pattern is identical to the Features ones.

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

npm run test           # 103 unit tests, no network
npm run build          # emits dist/, includes executable bin
npm run lint:check     # biome
```

No integration tests in this package — the `CalmClient` peer already
covers live-tenant verification (see
[mcp-calm-client/docs/TESTING.md](https://github.com/fr0ster/mcp-calm-client/blob/main/docs/TESTING.md)).
Tools here only mediate between MCP and the client; their contracts
are fully exercised via mocks.

## License

MIT — see [LICENSE](LICENSE).
