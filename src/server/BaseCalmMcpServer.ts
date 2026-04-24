import type { CalmClient } from '@mcp-abap-adt/calm-client';
import type { ILogger } from '@mcp-abap-adt/interfaces';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CalmToolRegistry } from '../registry/CalmToolRegistry';
import type { ICalmHandlerContext, ICalmHandlerGroup } from '../registry/types';

export interface IBaseCalmMcpServerOptions {
  name: string;
  version?: string;
  calm: CalmClient;
  logger?: ILogger;
  groups?: ICalmHandlerGroup[];
}

/**
 * Base MCP server that hosts Cloud ALM tools.
 *
 * Extends the SDK's `McpServer`, exposes a `CalmToolRegistry` pre-wired
 * with the groups passed in `options.groups`, and injects the
 * `CalmClient` + `logger` as handler context on every tool call.
 *
 * Consumers typically subclass this to add their own tool groups, or
 * use it directly when the default set is sufficient.
 */
export class BaseCalmMcpServer extends McpServer {
  protected readonly calm: CalmClient;
  protected readonly logger?: ILogger;
  protected readonly registry: CalmToolRegistry;

  constructor(options: IBaseCalmMcpServerOptions) {
    super({
      name: options.name,
      version: options.version ?? '0.0.0',
    });
    this.calm = options.calm;
    this.logger = options.logger;
    this.registry = new CalmToolRegistry(options.groups ?? []);
    this.registry.registerAll(this, () => this.buildContext());
  }

  /**
   * Override in subclasses to enrich the context (e.g. per-request
   * tracing metadata). Default returns the constructor-time calm +
   * logger.
   */
  protected buildContext(): ICalmHandlerContext {
    return { calm: this.calm, logger: this.logger };
  }

  /** Names of all tools currently registered. */
  listRegisteredTools(): string[] {
    return this.registry.listTools();
  }
}
