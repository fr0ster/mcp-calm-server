import { HandlerGroup } from '../../registry/HandlerGroup';
import type { ICalmHandlerEntry } from '../../registry/types';
import { getLogsTool } from './getLogs';
import { postLogsTool } from './postLogs';

export type { IGetLogsArgs, IGetLogsResult } from './getLogs';
export { getLogsTool } from './getLogs';
export type { IPostLogsArgs, IPostLogsResult } from './postLogs';
export { postLogsTool } from './postLogs';

export const LOGS_HANDLERS: readonly ICalmHandlerEntry[] = [
  getLogsTool,
  postLogsTool,
];

export const LOGS_GROUP = new HandlerGroup('logs', LOGS_HANDLERS);
