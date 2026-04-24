import type { ITask } from '@mcp-abap-adt/calm-client';
import type {
  CalmToolHandler,
  ICalmHandlerEntry,
  ICalmToolDefinition,
} from '../../registry/types';
import { CalmToolError, mapCalmErrorForTool } from '../../utils';

export interface IGetTaskArgs {
  id: string;
}

const definition: ICalmToolDefinition = {
  name: 'calm_tasks_get',
  description: 'Fetch a single task by id. Returns the full task record.',
  inputSchema: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', description: 'Task id.' },
    },
  },
};

const handler: CalmToolHandler<IGetTaskArgs, ITask> = async (ctx, args) => {
  if (!args?.id) {
    throw new CalmToolError({
      code: 'INVALID_ARGUMENT',
      message: 'id is required',
    });
  }
  try {
    return await ctx.calm.getTasks().get(args.id);
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

export const getTaskTool: ICalmHandlerEntry<IGetTaskArgs, ITask> = {
  toolDefinition: definition,
  handler,
};
