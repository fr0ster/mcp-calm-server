import type { ICreateTaskParams, ITask } from '@mcp-abap-adt/calm-client';
import type {
  CalmToolHandler,
  ICalmHandlerEntry,
  ICalmToolDefinition,
} from '../../registry/types';
import { CalmToolError, mapCalmErrorForTool } from '../../utils';

export type ICreateTaskArgs = ICreateTaskParams;

const definition: ICalmToolDefinition = {
  name: 'calm_tasks_create',
  description:
    'Create a new Cloud ALM task. Destructive. Requires `projectId`, `title`, and `type`. Returns the newly created task (including the server-generated id).',
  inputSchema: {
    type: 'object',
    required: ['projectId', 'title', 'type'],
    properties: {
      projectId: {
        type: 'string',
        description: 'Project id the task belongs to.',
      },
      title: { type: 'string', description: 'Short, human-readable title.' },
      type: {
        type: 'string',
        description:
          'Task type code (project-defined; e.g. requirement, defect).',
      },
      description: {
        type: 'string',
        description: 'Optional long-form description.',
      },
      priorityId: {
        type: 'integer',
        description: 'Optional numeric priority id.',
      },
      assigneeId: {
        type: 'string',
        description: 'Optional assignee user id.',
      },
      dueDate: {
        type: 'string',
        description: 'Optional ISO-8601 due date (yyyy-mm-dd).',
      },
    },
  },
};

const handler: CalmToolHandler<ICreateTaskArgs, ITask> = async (ctx, args) => {
  if (!args?.projectId || !args?.title || !args?.type) {
    throw new CalmToolError({
      code: 'INVALID_ARGUMENT',
      message: 'projectId, title and type are required',
    });
  }
  try {
    return await ctx.calm.getTasks().create(args);
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

export const createTaskTool: ICalmHandlerEntry<ICreateTaskArgs, ITask> = {
  toolDefinition: definition,
  handler,
};
