import type {
  CalmToolHandler,
  ICalmHandlerEntry,
  ICalmToolDefinition,
} from '../../registry/types';
import { CalmToolError, mapCalmErrorForTool } from '../../utils';

export interface IGetHierarchyWithChildrenArgs {
  uuid: string;
  relations?: string[];
}

export interface IGetHierarchyWithChildrenResult {
  node: Record<string, unknown>;
}

const definition: ICalmToolDefinition = {
  name: 'calm_hierarchy_get_with_children',
  description:
    'Fetch a hierarchy node and its expanded relations in a single call. Default expand is `toChildNodes,toParentNode`; override via `relations`. Returns the raw expanded node payload (shape depends on which relations were requested).',
  inputSchema: {
    type: 'object',
    required: ['uuid'],
    properties: {
      uuid: { type: 'string', description: 'Hierarchy node UUID.' },
      relations: {
        type: 'array',
        description:
          'OData navigation properties to expand. Default: ["toChildNodes","toParentNode"].',
        items: { type: 'string' },
      },
    },
  },
};

const handler: CalmToolHandler<
  IGetHierarchyWithChildrenArgs,
  IGetHierarchyWithChildrenResult
> = async (ctx, args) => {
  if (!args?.uuid) {
    throw new CalmToolError({
      code: 'INVALID_ARGUMENT',
      message: 'uuid is required',
    });
  }
  const relations =
    args.relations && args.relations.length > 0
      ? args.relations
      : ['toChildNodes', 'toParentNode'];
  try {
    const node = await ctx.calm
      .getHierarchy()
      .getWithExpand<Record<string, unknown>>(args.uuid, relations);
    return { node };
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

export const getHierarchyWithChildrenTool: ICalmHandlerEntry<
  IGetHierarchyWithChildrenArgs,
  IGetHierarchyWithChildrenResult
> = {
  toolDefinition: definition,
  handler,
};
