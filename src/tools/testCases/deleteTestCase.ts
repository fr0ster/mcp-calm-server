import type {
  CalmToolHandler,
  ICalmHandlerEntry,
  ICalmToolDefinition,
} from '../../registry/types';
import { CalmToolError, mapCalmErrorForTool } from '../../utils';

export interface IDeleteTestCaseArgs {
  uuid: string;
}

export interface IDeleteTestCaseResult {
  deleted: true;
  uuid: string;
}

const definition: ICalmToolDefinition = {
  name: 'calm_test_cases_delete',
  description:
    'Delete a manual test case by UUID. Destructive. Returns a confirmation object; raises NOT_FOUND if the test case does not exist.',
  inputSchema: {
    type: 'object',
    required: ['uuid'],
    properties: {
      uuid: { type: 'string', description: 'Test case UUID to delete.' },
    },
  },
};

const handler: CalmToolHandler<
  IDeleteTestCaseArgs,
  IDeleteTestCaseResult
> = async (ctx, args) => {
  if (!args?.uuid) {
    throw new CalmToolError({
      code: 'INVALID_ARGUMENT',
      message: 'uuid is required',
    });
  }
  try {
    await ctx.calm.getTestCases().delete(args.uuid);
    return { deleted: true, uuid: args.uuid };
  } catch (err) {
    throw mapCalmErrorForTool(err);
  }
};

export const deleteTestCaseTool: ICalmHandlerEntry<
  IDeleteTestCaseArgs,
  IDeleteTestCaseResult
> = {
  toolDefinition: definition,
  handler,
};
