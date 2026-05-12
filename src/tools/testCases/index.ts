import { HandlerGroup } from '../../registry/HandlerGroup';
import type { ICalmHandlerEntry } from '../../registry/types';
import { createTestActionTool } from './createTestAction';
import { createTestActivityTool } from './createTestActivity';
import { createTestCaseTool } from './createTestCase';
import { deleteTestCaseTool } from './deleteTestCase';
import { getTestCaseTool } from './getTestCase';
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
];

export const TESTCASES_GROUP = new HandlerGroup(
  'testCases',
  TESTCASES_HANDLERS,
);
