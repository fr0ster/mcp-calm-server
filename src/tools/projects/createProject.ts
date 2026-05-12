import type { ICreateProjectParams, IProject } from '@mcp-abap-adt/calm-client';
import type {
  CalmToolHandler,
  ICalmHandlerEntry,
  ICalmToolDefinition,
} from '../../registry/types';
import { CalmToolError, mapCalmErrorForTool } from '../../utils';

export type ICreateProjectArgs = ICreateProjectParams;

const definition: ICalmToolDefinition = {
  name: 'calm_projects_create',
  description:
    'Create a new Cloud ALM project. Destructive. Requires `name`; `description` and `programId` are optional. Returns the newly created project (including the server-generated id).',
  inputSchema: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', description: 'Project name.' },
      description: {
        type: 'string',
        description: 'Optional long-form description.',
      },
      programId: {
        type: 'string',
        description: 'Optional parent program id.',
      },
    },
  },
};

const handler: CalmToolHandler<ICreateProjectArgs, IProject> = async (
  ctx,
  args,
) => {
  if (!args?.name) {
    throw new CalmToolError({
      code: 'INVALID_ARGUMENT',
      message: 'name is required',
    });
  }
  try {
    return await ctx.calm.getProjects().create(args);
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

export const createProjectTool: ICalmHandlerEntry<
  ICreateProjectArgs,
  IProject
> = {
  toolDefinition: definition,
  handler,
};
