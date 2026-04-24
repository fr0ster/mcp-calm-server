import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { jsonSchemaToZodShape } from './jsonSchemaToZod';
import type {
  ICalmHandlerContext,
  ICalmHandlerEntry,
  ICalmHandlerGroup,
} from './types';

/**
 * Registers Cloud ALM tools on an MCP server instance.
 *
 * Accepts one or more handler groups (service-level tool bundles) and
 * a context factory. The factory is invoked lazily per tool call so
 * consumers can inject per-request connections (SSE/HTTP transport) if
 * they ever need it; for stdio the factory returns the same context
 * every call.
 */
export class CalmToolRegistry {
  private readonly groups: ICalmHandlerGroup[];
  private readonly registered = new Set<string>();

  constructor(groups: ICalmHandlerGroup[] = []) {
    this.groups = [...groups];
  }

  addGroup(group: ICalmHandlerGroup): void {
    this.groups.push(group);
  }

  listGroups(): readonly ICalmHandlerGroup[] {
    return [...this.groups];
  }

  listTools(): string[] {
    return [...this.registered];
  }

  /**
   * Register every tool from every group on the MCP server.
   * Throws on duplicate tool names so misconfiguration fails fast
   * during development.
   */
  registerAll(
    server: McpServer,
    getContext: () => ICalmHandlerContext | Promise<ICalmHandlerContext>,
  ): void {
    this.registered.clear();
    for (const group of this.groups) {
      for (const entry of group.getHandlers()) {
        this.registerOne(server, entry, getContext);
      }
    }
  }

  private registerOne(
    server: McpServer,
    entry: ICalmHandlerEntry,
    getContext: () => ICalmHandlerContext | Promise<ICalmHandlerContext>,
  ): void {
    const { toolDefinition, handler } = entry;
    if (this.registered.has(toolDefinition.name)) {
      throw new Error(
        `CalmToolRegistry: duplicate tool name "${toolDefinition.name}"`,
      );
    }
    this.registered.add(toolDefinition.name);

    const zodShape = jsonSchemaToZodShape(toolDefinition.inputSchema);
    server.registerTool(
      toolDefinition.name,
      {
        description: toolDefinition.description,
        inputSchema: zodShape,
      },
      async (args: unknown) => {
        const ctx = await getContext();
        const result = await handler(ctx, args);
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
        };
      },
    );
  }
}
