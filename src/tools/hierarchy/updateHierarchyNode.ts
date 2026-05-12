import type {
  IHierarchyNode,
  IUpdateHierarchyNodeParams,
} from '@mcp-abap-adt/calm-client';
import type {
  CalmToolHandler,
  ICalmHandlerEntry,
  ICalmToolDefinition,
} from '../../registry/types';
import { CalmToolError, mapCalmErrorForTool } from '../../utils';

export interface IUpdateHierarchyNodeArgs extends IUpdateHierarchyNodeParams {
  uuid: string;
}

const definition: ICalmToolDefinition = {
  name: 'calm_hierarchy_update_node',
  description:
    'Update fields on an existing hierarchy node (PATCH — only fields you pass are modified). Destructive. Identify the node by `uuid`. Returns the updated node.',
  inputSchema: {
    type: 'object',
    required: ['uuid'],
    properties: {
      uuid: { type: 'string', description: 'Hierarchy node UUID.' },
      title: { type: 'string', description: 'New title.' },
      description: { type: 'string', description: 'New description.' },
      sequence: { type: 'integer', description: 'New sibling ordering.' },
    },
  },
};

const handler: CalmToolHandler<
  IUpdateHierarchyNodeArgs,
  IHierarchyNode
> = async (ctx, args) => {
  if (!args?.uuid) {
    throw new CalmToolError({
      code: 'INVALID_ARGUMENT',
      message: 'uuid is required',
    });
  }
  const { uuid, ...patch } = args;
  try {
    return await ctx.calm.getHierarchy().update(uuid, patch);
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

export const updateHierarchyNodeTool: ICalmHandlerEntry<
  IUpdateHierarchyNodeArgs,
  IHierarchyNode
> = {
  toolDefinition: definition,
  handler,
};
