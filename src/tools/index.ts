import type { ICalmHandlerEntry, ICalmHandlerGroup } from '../registry/types';
import { ANALYTICS_GROUP, ANALYTICS_HANDLERS } from './analytics';
import { DOCUMENTS_GROUP, DOCUMENTS_HANDLERS } from './documents';
import { FEATURES_GROUP, FEATURES_HANDLERS } from './features';
import { HIERARCHY_GROUP, HIERARCHY_HANDLERS } from './hierarchy';
import { LOGS_GROUP, LOGS_HANDLERS } from './logs';
import {
  PROCESSMONITORING_GROUP,
  PROCESSMONITORING_HANDLERS,
} from './processMonitoring';
import { PROJECTS_GROUP, PROJECTS_HANDLERS } from './projects';
import { TASKS_GROUP, TASKS_HANDLERS } from './tasks';
import { TESTCASES_GROUP, TESTCASES_HANDLERS } from './testCases';

export {
  ANALYTICS_GROUP,
  ANALYTICS_HANDLERS,
  DOCUMENTS_GROUP,
  DOCUMENTS_HANDLERS,
  FEATURES_GROUP,
  FEATURES_HANDLERS,
  HIERARCHY_GROUP,
  HIERARCHY_HANDLERS,
  LOGS_GROUP,
  LOGS_HANDLERS,
  PROCESSMONITORING_GROUP,
  PROCESSMONITORING_HANDLERS,
  PROJECTS_GROUP,
  PROJECTS_HANDLERS,
  TASKS_GROUP,
  TASKS_HANDLERS,
  TESTCASES_GROUP,
  TESTCASES_HANDLERS,
};

/** All handler groups in one list — the default tool surface. */
export const ALL_GROUPS: readonly ICalmHandlerGroup[] = [
  FEATURES_GROUP,
  DOCUMENTS_GROUP,
  TESTCASES_GROUP,
  HIERARCHY_GROUP,
  ANALYTICS_GROUP,
  PROCESSMONITORING_GROUP,
  TASKS_GROUP,
  PROJECTS_GROUP,
  LOGS_GROUP,
];

/** Flattened handler entries across all groups. */
export const ALL_HANDLERS: readonly ICalmHandlerEntry[] = ALL_GROUPS.flatMap(
  (g) => g.getHandlers(),
);
