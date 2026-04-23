# @mcp-abap-adt/calm-server

[![Stand With Ukraine](https://raw.githubusercontent.com/vshymanskyy/StandWithUkraine/main/badges/StandWithUkraine.svg)](https://stand-with-ukraine.pp.ua)

MCP server for **SAP Cloud ALM**, built on
[`@mcp-abap-adt/calm-client`](https://github.com/fr0ster/mcp-calm-client).

This package is **dual-purpose**:

- **Runnable stdio server** — `npx calm-mcp` exposes Cloud ALM as MCP
  tools to any compatible MCP host (Claude Desktop, Claude Code, …).
- **Reusable library of tool primitives** — other MCP servers can import
  individual tools (`FEATURE_TOOLS`, `TASK_TOOLS`, …) and embed them in
  a larger composed server without re-implementation.

## Status

**Planning phase** — see [PLAN.md](PLAN.md) for the full development
roadmap, tool surface, architecture, and open decisions. No code yet;
scaffold only.

## License

MIT — see [LICENSE](LICENSE).
