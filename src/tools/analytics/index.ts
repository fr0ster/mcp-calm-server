import { HandlerGroup } from '../../registry/HandlerGroup';
import type { ICalmHandlerEntry } from '../../registry/types';

// Tools land here as they are implemented (see PLAN.md milestones M2-M4).
export const ANALYTICS_HANDLERS: readonly ICalmHandlerEntry[] = [];

export const ANALYTICS_GROUP = new HandlerGroup(
  'analytics',
  ANALYTICS_HANDLERS,
);
