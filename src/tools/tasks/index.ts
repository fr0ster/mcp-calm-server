import { HandlerGroup } from '../../registry/HandlerGroup';
import type { ICalmHandlerEntry } from '../../registry/types';
import { getTaskTool } from './getTask';
import { listTaskCommentsTool } from './listTaskComments';
import { listTasksTool } from './listTasks';

export type { IGetTaskArgs } from './getTask';
export { getTaskTool } from './getTask';
export type { IListTaskCommentsArgs } from './listTaskComments';
export { listTaskCommentsTool } from './listTaskComments';
export type { IListTasksArgs } from './listTasks';
export { listTasksTool } from './listTasks';

export const TASKS_HANDLERS: readonly ICalmHandlerEntry[] = [
  listTasksTool,
  getTaskTool,
  listTaskCommentsTool,
];

export const TASKS_GROUP = new HandlerGroup('tasks', TASKS_HANDLERS);
