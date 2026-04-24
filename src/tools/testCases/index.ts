import { HandlerGroup } from '../../registry/HandlerGroup';
import type { ICalmHandlerEntry } from '../../registry/types';
import { getTestCaseTool } from './getTestCase';
import { listTestCasesTool } from './listTestCases';

export type { IGetTestCaseArgs } from './getTestCase';
export { getTestCaseTool } from './getTestCase';
export type { IListTestCasesArgs } from './listTestCases';
export { listTestCasesTool } from './listTestCases';

export const TESTCASES_HANDLERS: readonly ICalmHandlerEntry[] = [
  listTestCasesTool,
  getTestCaseTool,
];

export const TESTCASES_GROUP = new HandlerGroup(
  'testCases',
  TESTCASES_HANDLERS,
);
