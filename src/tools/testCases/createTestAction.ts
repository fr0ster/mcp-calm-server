import type {
  ICreateTestActionParams,
  ITestAction,
} from '@mcp-abap-adt/calm-client';
import type {
  CalmToolHandler,
  ICalmHandlerEntry,
  ICalmToolDefinition,
} from '../../registry/types';
import { CalmToolError, mapCalmErrorForTool } from '../../utils';

export type ICreateTestActionArgs = ICreateTestActionParams;

const definition: ICalmToolDefinition = {
  name: 'calm_test_cases_create_action',
  description:
    'Create a test action (step) nested under a test activity. Destructive. Requires `title` and `parent_ID` (the parent activity/test case UUID). Returns the created action.',
  inputSchema: {
    type: 'object',
    required: ['title', 'parent_ID'],
    properties: {
      title: { type: 'string', description: 'Action title.' },
      parent_ID: {
        type: 'string',
        description: 'Parent UUID (activity or test case).',
      },
      description: {
        type: 'string',
        description: 'Optional description.',
      },
      expectedResult: {
        type: 'string',
        description: 'Expected outcome of the action.',
      },
      sequence: {
        type: 'integer',
        description: 'Optional ordering integer.',
      },
      isEvidenceRequired: {
        type: 'boolean',
        description:
          'Whether evidence must be captured to mark the action done.',
      },
    },
  },
};

const handler: CalmToolHandler<ICreateTestActionArgs, ITestAction> = async (
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
    return await ctx.calm.getTestCases().createAction(args);
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

export const createTestActionTool: ICalmHandlerEntry<
  ICreateTestActionArgs,
  ITestAction
> = {
  toolDefinition: definition,
  handler,
};
