import { HandlerGroup } from '../../registry/HandlerGroup';
import type { ICalmHandlerEntry } from '../../registry/types';
import { createTaskTool } from './createTask';
import { createTaskCommentTool } from './createTaskComment';
import { deleteTaskTool } from './deleteTask';
import { getTaskTool } from './getTask';
import { listTaskCommentsTool } from './listTaskComments';
import { listTasksTool } from './listTasks';
import { updateTaskTool } from './updateTask';

export type { ICreateTaskArgs } from './createTask';
export { createTaskTool } from './createTask';
export type { ICreateTaskCommentArgs } from './createTaskComment';
export { createTaskCommentTool } from './createTaskComment';
export type { IDeleteTaskArgs, IDeleteTaskResult } from './deleteTask';
export { deleteTaskTool } from './deleteTask';
export type { IGetTaskArgs } from './getTask';
export { getTaskTool } from './getTask';
export type { IListTaskCommentsArgs } from './listTaskComments';
export { listTaskCommentsTool } from './listTaskComments';
export type { IListTasksArgs } from './listTasks';
export { listTasksTool } from './listTasks';
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
];

export const TASKS_GROUP = new HandlerGroup('tasks', TASKS_HANDLERS);
