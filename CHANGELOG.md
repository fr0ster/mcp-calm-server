# Changelog

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
