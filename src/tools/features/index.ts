import { HandlerGroup } from '../../registry/HandlerGroup';
import type { ICalmHandlerEntry } from '../../registry/types';

// Tools land here as they are implemented (see PLAN.md milestones M2-M4).
export const FEATURES_HANDLERS: readonly ICalmHandlerEntry[] = [];

export const FEATURES_GROUP = new HandlerGroup('features', FEATURES_HANDLERS);
