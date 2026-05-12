import type {
  ICreateTestActivityParams,
  ITestActivity,
} from '@mcp-abap-adt/calm-client';
import type {
  CalmToolHandler,
  ICalmHandlerEntry,
  ICalmToolDefinition,
} from '../../registry/types';
import { CalmToolError, mapCalmErrorForTool } from '../../utils';

export type ICreateTestActivityArgs = ICreateTestActivityParams;

const definition: ICalmToolDefinition = {
  name: 'calm_test_cases_create_activity',
  description:
    'Create a test activity nested under a manual test case. Destructive. Requires `title` and `parent_ID` (the parent test case UUID). Returns the created activity.',
  inputSchema: {
    type: 'object',
    required: ['title', 'parent_ID'],
    properties: {
      title: { type: 'string', description: 'Activity title.' },
      parent_ID: {
        type: 'string',
        description: 'Parent test case UUID.',
      },
      description: {
        type: 'string',
        description: 'Optional long-form description.',
      },
      sequence: {
        type: 'integer',
        description: 'Optional ordering integer.',
      },
    },
  },
};

const handler: CalmToolHandler<ICreateTestActivityArgs, ITestActivity> = async (
  ctx,
  args,
) => {
  if (!args?.title || !args?.parent_ID) {
    throw new CalmToolError({
      code: 'INVALID_ARGUMENT',
      message: 'title and parent_ID are required',
    });
  }
  try {
    return await ctx.calm.getTestCases().createActivity(args);
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

export const createTestActivityTool: ICalmHandlerEntry<
  ICreateTestActivityArgs,
  ITestActivity
> = {
  toolDefinition: definition,
  handler,
};
