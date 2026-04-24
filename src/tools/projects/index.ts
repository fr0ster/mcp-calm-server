import { HandlerGroup } from '../../registry/HandlerGroup';
import type { ICalmHandlerEntry } from '../../registry/types';
import { getProjectTool } from './getProject';
import { listProjectsTool } from './listProjects';

export type { IGetProjectArgs } from './getProject';
export { getProjectTool } from './getProject';
export type { IListProjectsArgs } from './listProjects';
export { listProjectsTool } from './listProjects';

export const PROJECTS_HANDLERS: readonly ICalmHandlerEntry[] = [
  listProjectsTool,
  getProjectTool,
];

export const PROJECTS_GROUP = new HandlerGroup('projects', PROJECTS_HANDLERS);
