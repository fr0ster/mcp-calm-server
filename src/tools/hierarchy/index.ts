import { HandlerGroup } from '../../registry/HandlerGroup';
import type { ICalmHandlerEntry } from '../../registry/types';

// Tools land here as they are implemented (see PLAN.md milestones M2-M4).
export const HIERARCHY_HANDLERS: readonly ICalmHandlerEntry[] = [];

export const HIERARCHY_GROUP = new HandlerGroup(
  'hierarchy',
  HIERARCHY_HANDLERS,
);
