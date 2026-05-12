import type {
  ITestCase,
  IUpdateTestCaseParams,
} from '@mcp-abap-adt/calm-client';
import type {
  CalmToolHandler,
  ICalmHandlerEntry,
  ICalmToolDefinition,
} from '../../registry/types';
import { CalmToolError, mapCalmErrorForTool } from '../../utils';

export interface IUpdateTestCaseArgs extends IUpdateTestCaseParams {
  uuid: string;
}

const definition: ICalmToolDefinition = {
  name: 'calm_test_cases_update',
  description:
    'Update fields on an existing manual test case (PATCH — only fields you pass are modified). Destructive. Identify the test case by `uuid`. Returns the updated test case.',
  inputSchema: {
    type: 'object',
    required: ['uuid'],
    properties: {
      uuid: { type: 'string', description: 'Test case UUID.' },
      title: { type: 'string', description: 'New title.' },
      description: { type: 'string', description: 'New description.' },
      statusCode: { type: 'string', description: 'New status code.' },
    },
  },
};

const handler: CalmToolHandler<IUpdateTestCaseArgs, ITestCase> = async (
  ctx,
  args,
) => {
  if (!args?.uuid) {
    throw new CalmToolError({
      code: 'INVALID_ARGUMENT',
      message: 'uuid is required',
    });
  }
  const { uuid, ...patch } = args;
  try {
    return await ctx.calm.getTestCases().update(uuid, patch);
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

export const updateTestCaseTool: ICalmHandlerEntry<
  IUpdateTestCaseArgs,
  ITestCase
> = {
  toolDefinition: definition,
  handler,
};
