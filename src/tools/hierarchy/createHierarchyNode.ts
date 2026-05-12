import type {
  ICreateHierarchyNodeParams,
  IHierarchyNode,
} from '@mcp-abap-adt/calm-client';
import type {
  CalmToolHandler,
  ICalmHandlerEntry,
  ICalmToolDefinition,
} from '../../registry/types';
import { CalmToolError, mapCalmErrorForTool } from '../../utils';

export type ICreateHierarchyNodeArgs = ICreateHierarchyNodeParams;

const definition: ICalmToolDefinition = {
  name: 'calm_hierarchy_create_node',
  description:
    'Create a new process hierarchy node. Destructive. Requires `title`; pass `parentNodeUuid` to nest under an existing node (omit to create a root). Returns the newly created node.',
  inputSchema: {
    type: 'object',
    required: ['title'],
    properties: {
      title: { type: 'string', description: 'Node title.' },
      description: {
        type: 'string',
        description: 'Optional long-form description.',
      },
      parentNodeUuid: {
        type: 'string',
        description: 'Optional parent node UUID (omit for a root node).',
      },
      sequence: {
        type: 'integer',
        description: 'Optional ordering integer among siblings.',
      },
    },
  },
};

const handler: CalmToolHandler<
  ICreateHierarchyNodeArgs,
  IHierarchyNode
> = async (ctx, args) => {
  if (!args?.title) {
    throw new CalmToolError({
      code: 'INVALID_ARGUMENT',
      message: 'title is required',
    });
  }
  try {
    return await ctx.calm.getHierarchy().create(args);
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

export const createHierarchyNodeTool: ICalmHandlerEntry<
  ICreateHierarchyNodeArgs,
  IHierarchyNode
> = {
  toolDefinition: definition,
  handler,
};
