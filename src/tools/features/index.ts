import { HandlerGroup } from '../../registry/HandlerGroup';
import type { ICalmHandlerEntry } from '../../registry/types';
import { createFeatureTool } from './createFeature';
import { deleteFeatureTool } from './deleteFeature';
import { getFeatureTool } from './getFeature';
import { getFeatureByDisplayIdTool } from './getFeatureByDisplayId';
import { listFeaturePrioritiesTool } from './listFeaturePriorities';
import { listFeatureStatusesTool } from './listFeatureStatuses';
import { listFeaturesTool } from './listFeatures';
import { updateFeatureTool } from './updateFeature';

export type { ICreateFeatureArgs } from './createFeature';
export { createFeatureTool } from './createFeature';
export type {
  IDeleteFeatureArgs,
  IDeleteFeatureResult,
} from './deleteFeature';
export { deleteFeatureTool } from './deleteFeature';
export type { IGetFeatureArgs } from './getFeature';
export { getFeatureTool } from './getFeature';
export type { IGetFeatureByDisplayIdArgs } from './getFeatureByDisplayId';
export { getFeatureByDisplayIdTool } from './getFeatureByDisplayId';
export type { IListFeaturePrioritiesResult } from './listFeaturePriorities';
export { listFeaturePrioritiesTool } from './listFeaturePriorities';
export type { IListFeatureStatusesResult } from './listFeatureStatuses';
export { listFeatureStatusesTool } from './listFeatureStatuses';
export type { IListFeaturesArgs } from './listFeatures';
export { listFeaturesTool } from './listFeatures';
export type { IUpdateFeatureArgs } from './updateFeature';
export { updateFeatureTool } from './updateFeature';

export const FEATURES_HANDLERS: readonly ICalmHandlerEntry[] = [
  listFeaturesTool,
  getFeatureTool,
  getFeatureByDisplayIdTool,
  createFeatureTool,
  updateFeatureTool,
  deleteFeatureTool,
  listFeatureStatusesTool,
  listFeaturePrioritiesTool,
];

export const FEATURES_GROUP = new HandlerGroup('features', FEATURES_HANDLERS);
