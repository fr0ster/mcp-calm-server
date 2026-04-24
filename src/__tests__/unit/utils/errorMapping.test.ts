import { CalmApiError } from '@mcp-abap-adt/calm-client';
import {
  CalmToolError,
  mapCalmErrorForTool,
} from '../../../utils/errorMapping';

describe('mapCalmErrorForTool', () => {
  test('NOT_FOUND preserves 404 status', () => {
    const mapped = mapCalmErrorForTool(
      CalmApiError.fromNotFound('Feature', 'X'),
    );
    expect(mapped).toBeInstanceOf(CalmToolError);
    expect(mapped).toMatchObject({ code: 'NOT_FOUND', status: 404 });
  });

  test('ODATA_ERROR carries serviceCode', () => {
    const mapped = mapCalmErrorForTool(
      CalmApiError.fromOData(400, { code: 'BAD', message: 'broken filter' }),
    );
    expect(mapped).toMatchObject({
      code: 'ODATA_ERROR',
      serviceCode: 'BAD',
      status: 400,
    });
  });

  test('HTTP_ERROR truncates long bodies in message', () => {
    const mapped = mapCalmErrorForTool(
      CalmApiError.fromHttp(500, 'x'.repeat(500)),
    );
    expect(mapped.code).toBe('HTTP_ERROR');
    expect(mapped.message.length).toBeLessThan(250);
  });

  test('NETWORK maps to friendly unreachable message', () => {
    const mapped = mapCalmErrorForTool(
      CalmApiError.fromNetwork(new Error('ECONNREFUSED')),
    );
    expect(mapped).toMatchObject({ code: 'NETWORK' });
    expect(mapped.message).toMatch(/unreachable/i);
  });

  test('non-CalmApiError falls through as UNKNOWN', () => {
    const mapped = mapCalmErrorForTool(new Error('boom'));
    expect(mapped).toMatchObject({ code: 'UNKNOWN', message: 'boom' });
  });

  test('non-Error values still yield UNKNOWN', () => {
    const mapped = mapCalmErrorForTool('weird string');
    expect(mapped).toMatchObject({ code: 'UNKNOWN', message: 'weird string' });
  });

  test('CalmToolError is an Error subclass with name and cause', () => {
    const cause = new Error('root');
    const err = new CalmToolError({ code: 'X', message: 'msg', cause });
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('CalmToolError');
    expect((err as Error & { cause?: unknown }).cause).toBe(cause);
  });
});
