import type { CalmClient } from '@mcp-abap-adt/calm-client';
import type { ILogger } from '@mcp-abap-adt/interfaces';

/**
 * Handler context injected by the registry when a tool is invoked.
 *
 * Handlers never see MCP-server / transport concerns — they receive
 * only the client + (optional) logger. Swap the `calm` field with a
 * mock `CalmClient` to unit-test any handler without a network.
 */
export interface ICalmHandlerContext {
  calm: CalmClient;
  logger?: ILogger;
}

/**
 * MCP tool definition — schema-first, transport-agnostic.
 *
 * `inputSchema` is JSON Schema (draft 07). The registry converts it to
 * the shape the MCP SDK expects at registration time, so handler files
 * stay pure.
 */
export interface ICalmToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

/**
 * Tool handler — a pure async function. Context carries dependencies
 * (calm + logger); `args` is the validated input; result is whatever
 * the tool returns to the LLM.
 */
/**
 * Tool handler signature.
 *
 * NOTE: `TArgs` defaults to `any` (not `unknown`) on purpose —
 * tool-entry arrays collect heterogeneously-typed tools, and `TArgs`
 * sits in a contravariant (function-input) position. With `unknown`,
 * a narrower concrete tool type cannot be assigned to the collection
 * type. `any` is bivariant and sidesteps this. Individual tools still
 * declare precise `TArgs` at their declaration site.
 */
// biome-ignore lint/suspicious/noExplicitAny: see doc comment above.
export type CalmToolHandler<TArgs = any, TResult = unknown> = (
  context: ICalmHandlerContext,
  args: TArgs,
) => Promise<TResult>;

/**
 * Registration unit — pairs a definition with its handler. See the
 * `CalmToolHandler` doc comment for the `any` default rationale.
 */
// biome-ignore lint/suspicious/noExplicitAny: see CalmToolHandler.
export interface ICalmHandlerEntry<TArgs = any, TResult = unknown> {
  toolDefinition: ICalmToolDefinition;
  handler: CalmToolHandler<TArgs, TResult>;
}

/**
 * Logical grouping of tools (per Cloud ALM service, typically). Enables
 * ad-hoc composition — consumers can opt into subsets instead of always
 * taking `ALL_TOOLS`.
 */
export interface ICalmHandlerGroup {
  getName(): string;
  getHandlers(): readonly ICalmHandlerEntry[];
}
