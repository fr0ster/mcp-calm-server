import { HandlerGroup } from '../../registry/HandlerGroup';
import type { ICalmHandlerEntry } from '../../registry/types';
import { createTestActionTool } from './createTestAction';
import { createTestActivityTool } from './createTestActivity';
import { createTestCaseTool } from './createTestCase';
import { deleteTestCaseTool } from './deleteTestCase';
import { getTestCaseTool } from './getTestCase';
import { listTestActionsTool } from './listTestActions';
import { listTestActivitiesTool } from './listTestActivities';
import { listTestCasesTool } from './listTestCases';
import { updateTestCaseTool } from './updateTestCase';

export type { ICreateTestActionArgs } from './createTestAction';
export { createTestActionTool } from './createTestAction';
export type { ICreateTestActivityArgs } from './createTestActivity';
export { createTestActivityTool } from './createTestActivity';
export type { ICreateTestCaseArgs } from './createTestCase';
export { createTestCaseTool } from './createTestCase';
export type {
  IDeleteTestCaseArgs,
  IDeleteTestCaseResult,
} from './deleteTestCase';
export { deleteTestCaseTool } from './deleteTestCase';
export type { IGetTestCaseArgs } from './getTestCase';
export { getTestCaseTool } from './getTestCase';
export type { IListTestActionsArgs } from './listTestActions';
export { listTestActionsTool } from './listTestActions';
export type { IListTestActivitiesArgs } from './listTestActivities';
export { listTestActivitiesTool } from './listTestActivities';
export type { IListTestCasesArgs } from './listTestCases';
export { listTestCasesTool } from './listTestCases';
export type { IUpdateTestCaseArgs } from './updateTestCase';
export { updateTestCaseTool } from './updateTestCase';

export const TESTCASES_HANDLERS: readonly ICalmHandlerEntry[] = [
  listTestCasesTool,
  getTestCaseTool,
  createTestCaseTool,
  updateTestCaseTool,
  deleteTestCaseTool,
  createTestActivityTool,
  createTestActionTool,
  listTestActivitiesTool,
  listTestActionsTool,
];

export const TESTCASES_GROUP = new HandlerGroup(
  'testCases',
  TESTCASES_HANDLERS,
);
