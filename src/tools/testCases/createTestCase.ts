import type {
  ICreateTestCaseParams,
  ITestCase,
} from '@mcp-abap-adt/calm-client';
import type {
  CalmToolHandler,
  ICalmHandlerEntry,
  ICalmToolDefinition,
} from '../../registry/types';
import { CalmToolError, mapCalmErrorForTool } from '../../utils';

export type ICreateTestCaseArgs = ICreateTestCaseParams;

const definition: ICalmToolDefinition = {
  name: 'calm_test_cases_create',
  description:
    'Create a new manual test case. Destructive. Requires `title`; `projectId` and `description` are optional. Returns the newly created test case (including the server-generated UUID).',
  inputSchema: {
    type: 'object',
    required: ['title'],
    properties: {
      title: { type: 'string', description: 'Test case title.' },
      description: {
        type: 'string',
        description: 'Optional long-form description.',
      },
      projectId: {
        type: 'string',
        description: 'Optional project scope.',
      },
    },
  },
};

const handler: CalmToolHandler<ICreateTestCaseArgs, ITestCase> = async (
  ctx,
  args,
) => {
  if (!args?.title) {
    throw new CalmToolError({
      code: 'INVALID_ARGUMENT',
      message: 'title is required',
    });
  }
  try {
    return await ctx.calm.getTestCases().create(args);
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

export const createTestCaseTool: ICalmHandlerEntry<
  ICreateTestCaseArgs,
  ITestCase
> = {
  toolDefinition: definition,
  handler,
};
