import type { IProject } from '@mcp-abap-adt/calm-client';
import type {
  CalmToolHandler,
  ICalmHandlerEntry,
  ICalmToolDefinition,
} from '../../registry/types';
import { CalmToolError, mapCalmErrorForTool } from '../../utils';

export interface IGetProjectArgs {
  id: string;
}

const definition: ICalmToolDefinition = {
  name: 'calm_projects_get',
  description:
    'Fetch a Cloud ALM project by id. Returns the full project record.',
  inputSchema: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string', description: 'Project id.' } },
  },
};

const handler: CalmToolHandler<IGetProjectArgs, IProject> = async (
  ctx,
  args,
) => {
  if (!args?.id) {
    throw new CalmToolError({
      code: 'INVALID_ARGUMENT',
      message: 'id is required',
    });
  }
  try {
    return await ctx.calm.getProjects().get(args.id);
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

export const getProjectTool: ICalmHandlerEntry<IGetProjectArgs, IProject> = {
  toolDefinition: definition,
  handler,
};
