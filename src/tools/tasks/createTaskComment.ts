import type {
  ICreateTaskCommentParams,
  ITaskComment,
} from '@mcp-abap-adt/calm-client';
import type {
  CalmToolHandler,
  ICalmHandlerEntry,
  ICalmToolDefinition,
} from '../../registry/types';
import { CalmToolError, mapCalmErrorForTool } from '../../utils';

export interface ICreateTaskCommentArgs extends ICreateTaskCommentParams {
  taskId: string;
}

const definition: ICalmToolDefinition = {
  name: 'calm_tasks_create_comment',
  description:
    'Post a comment to a Cloud ALM task. Destructive. Returns the created comment record.',
  inputSchema: {
    type: 'object',
    required: ['taskId', 'content'],
    properties: {
      taskId: { type: 'string', description: 'Parent task id.' },
      content: { type: 'string', description: 'Comment body (plain text).' },
    },
  },
};

const handler: CalmToolHandler<ICreateTaskCommentArgs, ITaskComment> = async (
  ctx,
  args,
) => {
  if (!args?.taskId || !args?.content) {
    throw new CalmToolError({
      code: 'INVALID_ARGUMENT',
      message: 'taskId and content are required',
    });
  }
  const { taskId, ...payload } = args;
  try {
    return await ctx.calm.getTasks().createComment(taskId, payload);
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

export const createTaskCommentTool: ICalmHandlerEntry<
  ICreateTaskCommentArgs,
  ITaskComment
> = {
  toolDefinition: definition,
  handler,
};
