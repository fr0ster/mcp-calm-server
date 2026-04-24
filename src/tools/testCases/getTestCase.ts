import type { ITestCase } from '@mcp-abap-adt/calm-client';
import type {
  CalmToolHandler,
  ICalmHandlerEntry,
  ICalmToolDefinition,
} from '../../registry/types';
import { CalmToolError, mapCalmErrorForTool } from '../../utils';

export interface IGetTestCaseArgs {
  uuid: string;
}

const definition: ICalmToolDefinition = {
  name: 'calm_test_cases_get',
  description:
    'Fetch a manual test case by UUID. Returns the full record with title, description, status, project scope.',
  inputSchema: {
    type: 'object',
    required: ['uuid'],
    properties: {
      uuid: { type: 'string', description: 'Test case UUID.' },
    },
  },
};

const handler: CalmToolHandler<IGetTestCaseArgs, ITestCase> = async (
  ctx,
  args,
) => {
  if (!args?.uuid) {
    throw new CalmToolError({
      code: 'INVALID_ARGUMENT',
      message: 'uuid is required',
    });
  }
  try {
    return await ctx.calm.getTestCases().get(args.uuid);
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

export const getTestCaseTool: ICalmHandlerEntry<IGetTestCaseArgs, ITestCase> = {
  toolDefinition: definition,
  handler,
};
