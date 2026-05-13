import { HandlerGroup } from '../../registry/HandlerGroup';
import type { ICalmHandlerEntry } from '../../registry/types';
import { createProjectTool } from './createProject';
import { getProgramTool } from './getProgram';
import { getProjectTool } from './getProject';
import { listProgramsTool } from './listPrograms';
import { listProjectsTool } from './listProjects';
import { listTeamMembersTool } from './listTeamMembers';
import { listTimeboxesTool } from './listTimeboxes';

export type { ICreateProjectArgs } from './createProject';
export { createProjectTool } from './createProject';
export type { IGetProgramArgs } from './getProgram';
export { getProgramTool } from './getProgram';
export type { IGetProjectArgs } from './getProject';
export { getProjectTool } from './getProject';
export type { IListProgramsArgs } from './listPrograms';
export { listProgramsTool } from './listPrograms';
export type { IListProjectsArgs } from './listProjects';
export { listProjectsTool } from './listProjects';
export type { IListTeamMembersArgs } from './listTeamMembers';
export { listTeamMembersTool } from './listTeamMembers';
export type { IListTimeboxesArgs } from './listTimeboxes';
export { listTimeboxesTool } from './listTimeboxes';

export const PROJECTS_HANDLERS: readonly ICalmHandlerEntry[] = [
  listProjectsTool,
  getProjectTool,
  createProjectTool,
  listProgramsTool,
  getProgramTool,
  listTeamMembersTool,
  listTimeboxesTool,
];

export const PROJECTS_GROUP = new HandlerGroup('projects', PROJECTS_HANDLERS);
