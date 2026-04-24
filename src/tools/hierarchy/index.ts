import { HandlerGroup } from '../../registry/HandlerGroup';
import type { ICalmHandlerEntry } from '../../registry/types';
import { getHierarchyWithChildrenTool } from './getHierarchyWithChildren';
import { listHierarchyTool } from './listHierarchy';

export type {
  IGetHierarchyWithChildrenArgs,
  IGetHierarchyWithChildrenResult,
} from './getHierarchyWithChildren';
export { getHierarchyWithChildrenTool } from './getHierarchyWithChildren';
export type { IListHierarchyArgs } from './listHierarchy';
export { listHierarchyTool } from './listHierarchy';

export const HIERARCHY_HANDLERS: readonly ICalmHandlerEntry[] = [
  listHierarchyTool,
  getHierarchyWithChildrenTool,
];

export const HIERARCHY_GROUP = new HandlerGroup(
  'hierarchy',
  HIERARCHY_HANDLERS,
);
