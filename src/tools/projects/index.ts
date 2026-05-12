import { HandlerGroup } from '../../registry/HandlerGroup';
import type { ICalmHandlerEntry } from '../../registry/types';
import { createProjectTool } from './createProject';
import { getProjectTool } from './getProject';
import { listProjectsTool } from './listProjects';

export type { ICreateProjectArgs } from './createProject';
export { createProjectTool } from './createProject';
export type { IGetProjectArgs } from './getProject';
export { getProjectTool } from './getProject';
export type { IListProjectsArgs } from './listProjects';
export { listProjectsTool } from './listProjects';

export const PROJECTS_HANDLERS: readonly ICalmHandlerEntry[] = [
  listProjectsTool,
  getProjectTool,
  createProjectTool,
];

export const PROJECTS_GROUP = new HandlerGroup('projects', PROJECTS_HANDLERS);
