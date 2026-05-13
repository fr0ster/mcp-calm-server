import type { IProgram } from '@mcp-abap-adt/calm-client';
import type {
  CalmToolHandler,
  ICalmHandlerEntry,
  ICalmToolDefinition,
} from '../../registry/types';
import { CalmToolError, mapCalmErrorForTool } from '../../utils';

export interface IGetProgramArgs {
  id: string;
}

const definition: ICalmToolDefinition = {
  name: 'calm_projects_get_program',
  description:
    'Fetch a Cloud ALM program by id. A program is the parent organisational unit that groups one or more projects.',
  inputSchema: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string', description: 'Program id.' } },
  },
};

const handler: CalmToolHandler<IGetProgramArgs, IProgram> = async (
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
    return await ctx.calm.getProjects().getProgram(args.id);
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

export const getProgramTool: ICalmHandlerEntry<IGetProgramArgs, IProgram> = {
  toolDefinition: definition,
  handler,
};
