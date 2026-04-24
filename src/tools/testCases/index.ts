import { HandlerGroup } from '../../registry/HandlerGroup';
import type { ICalmHandlerEntry } from '../../registry/types';

// Tools land here as they are implemented (see PLAN.md milestones M2-M4).
export const TESTCASES_HANDLERS: readonly ICalmHandlerEntry[] = [];

export const TESTCASES_GROUP = new HandlerGroup(
  'testCases',
  TESTCASES_HANDLERS,
);
