import { HandlerGroup } from '../../registry/HandlerGroup';
import type { ICalmHandlerEntry } from '../../registry/types';
import { createTaskTool } from './createTask';
import { createTaskCommentTool } from './createTaskComment';
import { deleteTaskTool } from './deleteTask';
import { getTaskTool } from './getTask';
import { listDeliverablesTool } from './listDeliverables';
import { listTaskCommentsTool } from './listTaskComments';
import { listTaskReferencesTool } from './listTaskReferences';
import { listTasksTool } from './listTasks';
import { listWorkstreamsTool } from './listWorkstreams';
import { updateTaskTool } from './updateTask';

export type { ICreateTaskArgs } from './createTask';
export { createTaskTool } from './createTask';
export type { ICreateTaskCommentArgs } from './createTaskComment';
export { createTaskCommentTool } from './createTaskComment';
export type { IDeleteTaskArgs, IDeleteTaskResult } from './deleteTask';
export { deleteTaskTool } from './deleteTask';
export type { IGetTaskArgs } from './getTask';
export { getTaskTool } from './getTask';
export type { IListDeliverablesArgs } from './listDeliverables';
export { listDeliverablesTool } from './listDeliverables';
export type { IListTaskCommentsArgs } from './listTaskComments';
export { listTaskCommentsTool } from './listTaskComments';
export type { IListTaskReferencesArgs } from './listTaskReferences';
export { listTaskReferencesTool } from './listTaskReferences';
export type { IListTasksArgs } from './listTasks';
export { listTasksTool } from './listTasks';
export type { IListWorkstreamsArgs } from './listWorkstreams';
export { listWorkstreamsTool } from './listWorkstreams';
export type { IUpdateTaskArgs } from './updateTask';
export { updateTaskTool } from './updateTask';

export const TASKS_HANDLERS: readonly ICalmHandlerEntry[] = [
  listTasksTool,
  getTaskTool,
  createTaskTool,
  updateTaskTool,
  deleteTaskTool,
  listTaskCommentsTool,
  createTaskCommentTool,
  listTaskReferencesTool,
  listDeliverablesTool,
  listWorkstreamsTool,
];

export const TASKS_GROUP = new HandlerGroup('tasks', TASKS_HANDLERS);
