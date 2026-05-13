import { HandlerGroup } from '../../registry/HandlerGroup';
import type { ICalmHandlerEntry } from '../../registry/types';
import { createExternalReferenceTool } from './createExternalReference';
import { createFeatureTool } from './createFeature';
import { deleteExternalReferenceTool } from './deleteExternalReference';
import { deleteFeatureTool } from './deleteFeature';
import { getFeatureTool } from './getFeature';
import { getFeatureByDisplayIdTool } from './getFeatureByDisplayId';
import { listExternalReferencesTool } from './listExternalReferences';
import { listFeaturePrioritiesTool } from './listFeaturePriorities';
import { listFeatureStatusesTool } from './listFeatureStatuses';
import { listFeaturesTool } from './listFeatures';
import { updateFeatureTool } from './updateFeature';

export type { ICreateExternalReferenceArgs } from './createExternalReference';
export { createExternalReferenceTool } from './createExternalReference';
export type { ICreateFeatureArgs } from './createFeature';
export { createFeatureTool } from './createFeature';
export type {
  IDeleteExternalReferenceArgs,
  IDeleteExternalReferenceResult,
} from './deleteExternalReference';
export { deleteExternalReferenceTool } from './deleteExternalReference';
export type {
  IDeleteFeatureArgs,
  IDeleteFeatureResult,
} from './deleteFeature';
export { deleteFeatureTool } from './deleteFeature';
export type { IGetFeatureArgs } from './getFeature';
export { getFeatureTool } from './getFeature';
export type { IGetFeatureByDisplayIdArgs } from './getFeatureByDisplayId';
export { getFeatureByDisplayIdTool } from './getFeatureByDisplayId';
export type { IListExternalReferencesArgs } from './listExternalReferences';
export { listExternalReferencesTool } from './listExternalReferences';
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
  createExternalReferenceTool,
  deleteExternalReferenceTool,
  listExternalReferencesTool,
  listFeatureStatusesTool,
  listFeaturePrioritiesTool,
];

export const FEATURES_GROUP = new HandlerGroup('features', FEATURES_HANDLERS);
