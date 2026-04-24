import { HandlerGroup } from '../../registry/HandlerGroup';
import type { ICalmHandlerEntry } from '../../registry/types';

// Tools land here as they are implemented (see PLAN.md milestones M2-M4).
export const PROCESSMONITORING_HANDLERS: readonly ICalmHandlerEntry[] = [];

export const PROCESSMONITORING_GROUP = new HandlerGroup(
  'processMonitoring',
  PROCESSMONITORING_HANDLERS,
);
