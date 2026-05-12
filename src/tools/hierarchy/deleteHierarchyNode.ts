import type {
  CalmToolHandler,
  ICalmHandlerEntry,
  ICalmToolDefinition,
} from '../../registry/types';
import { CalmToolError, mapCalmErrorForTool } from '../../utils';

export interface IDeleteHierarchyNodeArgs {
  uuid: string;
}

export interface IDeleteHierarchyNodeResult {
  deleted: true;
  uuid: string;
}

const definition: ICalmToolDefinition = {
  name: 'calm_hierarchy_delete_node',
  description:
    'Delete a hierarchy node by UUID. Destructive. Does not cascade to children — clean those up explicitly first. Raises NOT_FOUND if the node does not exist.',
  inputSchema: {
    type: 'object',
    required: ['uuid'],
    properties: {
      uuid: { type: 'string', description: 'Hierarchy node UUID to delete.' },
    },
  },
};

const handler: CalmToolHandler<
  IDeleteHierarchyNodeArgs,
  IDeleteHierarchyNodeResult
> = async (ctx, args) => {
  if (!args?.uuid) {
    throw new CalmToolError({
      code: 'INVALID_ARGUMENT',
      message: 'uuid is required',
    });
  }
  try {
    await ctx.calm.getHierarchy().delete(args.uuid);
    return { deleted: true, uuid: args.uuid };
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

export const deleteHierarchyNodeTool: ICalmHandlerEntry<
  IDeleteHierarchyNodeArgs,
  IDeleteHierarchyNodeResult
> = {
  toolDefinition: definition,
  handler,
};
