import type { ITask, IUpdateTaskParams } from '@mcp-abap-adt/calm-client';
import type {
  CalmToolHandler,
  ICalmHandlerEntry,
  ICalmToolDefinition,
} from '../../registry/types';
import { CalmToolError, mapCalmErrorForTool } from '../../utils';

export interface IUpdateTaskArgs extends IUpdateTaskParams {
  id: string;
}

const definition: ICalmToolDefinition = {
  name: 'calm_tasks_update',
  description:
    'Update fields on an existing Cloud ALM task (PATCH — only fields you pass are modified). Destructive. Identify the task by `id`. Returns the updated task.',
  inputSchema: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', description: 'Task id.' },
      title: { type: 'string', description: 'New title (if changing).' },
      description: { type: 'string', description: 'New description.' },
      status: { type: 'string', description: 'New status code.' },
      priorityId: { type: 'integer', description: 'New priority id.' },
      assigneeId: { type: 'string', description: 'New assignee user id.' },
      dueDate: {
        type: 'string',
        description: 'New ISO-8601 due date (yyyy-mm-dd).',
      },
    },
  },
};

const handler: CalmToolHandler<IUpdateTaskArgs, ITask> = async (ctx, args) => {
  if (!args?.id) {
    throw new CalmToolError({
      code: 'INVALID_ARGUMENT',
      message: 'id is required',
    });
  }
  const { id, ...patch } = args;
  try {
    return await ctx.calm.getTasks().update(id, patch);
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

export const updateTaskTool: ICalmHandlerEntry<IUpdateTaskArgs, ITask> = {
  toolDefinition: definition,
  handler,
};
