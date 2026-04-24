import { type ITask, ODataQuery } from '@mcp-abap-adt/calm-client';
import type {
  CalmToolHandler,
  ICalmHandlerEntry,
  ICalmToolDefinition,
} from '../../registry/types';
import {
  CalmToolError,
  clampListLimit,
  escapeODataString,
  type IListResponse,
  joinAndFilters,
  MAX_LIST_LIMIT,
  mapCalmErrorForTool,
  toListResponse,
} from '../../utils';

const DEFAULT_FIELDS = [
  'id',
  'projectId',
  'title',
  'status',
  'priorityId',
  'assigneeId',
  'dueDate',
] as const;

const ALLOWED_FIELDS = [
  'id',
  'projectId',
  'title',
  'description',
  'type',
  'status',
  'subStatus',
  'externalId',
  'dueDate',
  'priorityId',
  'assigneeId',
  'assigneeName',
  'timeboxName',
  'timeboxStartDate',
  'timeboxEndDate',
  'lastChangedDate',
] as const;
type AllowedField = (typeof ALLOWED_FIELDS)[number];

export interface IListTasksArgs {
  projectId: string;
  status?: string;
  assigneeId?: string;
  fields?: AllowedField[];
  limit?: number;
  offset?: number;
  withCount?: boolean;
}

const definition: ICalmToolDefinition = {
  name: 'calm_tasks_list',
  description:
    'List tasks in a Cloud ALM project. Returns compact records (id, title, status, assignee, due date by default). Filter by status and/or assigneeId.',
  inputSchema: {
    type: 'object',
    required: ['projectId'],
    properties: {
      projectId: {
        type: 'string',
        description: 'Project id (required scope).',
      },
      status: { type: 'string' },
      assigneeId: { type: 'string' },
      fields: {
        type: 'array',
        items: { type: 'string', enum: [...ALLOWED_FIELDS] },
      },
      limit: { type: 'integer', minimum: 1, maximum: MAX_LIST_LIMIT },
      offset: { type: 'integer', minimum: 0 },
      withCount: { type: 'boolean' },
    },
  },
};

const handler: CalmToolHandler<
  IListTasksArgs,
  IListResponse<Partial<ITask>>
> = async (ctx, args) => {
  if (!args?.projectId) {
    throw new CalmToolError({
      code: 'INVALID_ARGUMENT',
      message: 'projectId is required',
    });
  }
  const limit = clampListLimit(args.limit);
  const offset = args.offset && args.offset > 0 ? Math.floor(args.offset) : 0;
  const filter = joinAndFilters(
    `projectId eq '${escapeODataString(args.projectId)}'`,
    args.status ? `status eq '${escapeODataString(args.status)}'` : undefined,
    args.assigneeId
      ? `assigneeId eq '${escapeODataString(args.assigneeId)}'`
      : undefined,
  );
  const fields =
    args.fields && args.fields.length > 0 ? args.fields : DEFAULT_FIELDS;
  let query = ODataQuery.new()
    .select([...fields])
    .top(limit)
    .skip(offset);
  if (filter) query = query.filter(filter);
  if (args.withCount) query = query.count();

  try {
    const collection = await ctx.calm.getTasks().list(query);
    return toListResponse(collection, { limit, offset });
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

export const listTasksTool: ICalmHandlerEntry<
  IListTasksArgs,
  IListResponse<Partial<ITask>>
> = {
  toolDefinition: definition,
  handler,
};
