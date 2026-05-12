import { HandlerGroup } from '../../registry/HandlerGroup';
import type { ICalmHandlerEntry } from '../../registry/types';
import { createHierarchyNodeTool } from './createHierarchyNode';
import { deleteHierarchyNodeTool } from './deleteHierarchyNode';
import { getHierarchyWithChildrenTool } from './getHierarchyWithChildren';
import { listHierarchyTool } from './listHierarchy';
import { updateHierarchyNodeTool } from './updateHierarchyNode';

export type { ICreateHierarchyNodeArgs } from './createHierarchyNode';
export { createHierarchyNodeTool } from './createHierarchyNode';
export type {
  IDeleteHierarchyNodeArgs,
  IDeleteHierarchyNodeResult,
} from './deleteHierarchyNode';
export { deleteHierarchyNodeTool } from './deleteHierarchyNode';
export type {
  IGetHierarchyWithChildrenArgs,
  IGetHierarchyWithChildrenResult,
} from './getHierarchyWithChildren';
export { getHierarchyWithChildrenTool } from './getHierarchyWithChildren';
export type { IListHierarchyArgs } from './listHierarchy';
export { listHierarchyTool } from './listHierarchy';
export type { IUpdateHierarchyNodeArgs } from './updateHierarchyNode';
export { updateHierarchyNodeTool } from './updateHierarchyNode';

export const HIERARCHY_HANDLERS: readonly ICalmHandlerEntry[] = [
  listHierarchyTool,
  getHierarchyWithChildrenTool,
  createHierarchyNodeTool,
  updateHierarchyNodeTool,
  deleteHierarchyNodeTool,
];

export const HIERARCHY_GROUP = new HandlerGroup(
  'hierarchy',
  HIERARCHY_HANDLERS,
);
