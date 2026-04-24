/**
 * @mcp-abap-adt/calm-server — public API
 *
 * Two ways to consume:
 *  1. Library: import handler groups and compose them onto your own
 *     `McpServer` instance (optionally alongside other MCP packages).
 *  2. Runnable server: `npx calm-mcp` (see bin/stdio.ts, planned M5).
 *
 * See PLAN.md for roadmap.
 */

export {
  type CalmToolHandler,
  CalmToolRegistry,
  HandlerGroup,
  type ICalmHandlerContext,
  type ICalmHandlerEntry,
  type ICalmHandlerGroup,
  type ICalmToolDefinition,
} from './registry';
export {
  BaseCalmMcpServer,
  type IBaseCalmMcpServerOptions,
} from './server';
export * from './tools';
