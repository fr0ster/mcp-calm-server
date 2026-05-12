import type {
  CalmToolHandler,
  ICalmHandlerEntry,
  ICalmToolDefinition,
} from '../../registry/types';
import { CalmToolError, mapCalmErrorForTool } from '../../utils';

export interface IDeleteTaskArgs {
  id: string;
}

export interface IDeleteTaskResult {
  deleted: true;
  id: string;
}

const definition: ICalmToolDefinition = {
  name: 'calm_tasks_delete',
  description:
    'Delete a Cloud ALM task by id. Destructive. Returns a confirmation object; raises NOT_FOUND if the task does not exist.',
  inputSchema: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', description: 'Task id to delete.' },
    },
  },
};

const handler: CalmToolHandler<IDeleteTaskArgs, IDeleteTaskResult> = async (
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
    await ctx.calm.getTasks().delete(args.id);
    return { deleted: true, id: args.id };
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

export const deleteTaskTool: ICalmHandlerEntry<
  IDeleteTaskArgs,
  IDeleteTaskResult
> = {
  toolDefinition: definition,
  handler,
};
