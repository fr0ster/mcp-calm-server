import type { CalmClient } from '@mcp-abap-adt/calm-client';
import { HandlerGroup } from '../../../registry/HandlerGroup';
import type {
  ICalmHandlerContext,
  ICalmHandlerEntry,
} from '../../../registry/types';
import { BaseCalmMcpServer } from '../../../server/BaseCalmMcpServer';

function fakeCalmClient(): CalmClient {
  return {} as CalmClient;
}

function makeEntry(name: string): ICalmHandlerEntry {
  return {
    toolDefinition: {
      name,
      description: `Test ${name}`,
      inputSchema: {} as never,
    },
    handler: async () => ({ ok: true }),
  };
}

describe('BaseCalmMcpServer', () => {
  test('registers tools from all provided groups on construction', () => {
    const g1 = new HandlerGroup('g1', [
      makeEntry('calm_a'),
      makeEntry('calm_b'),
    ]);
    const g2 = new HandlerGroup('g2', [makeEntry('calm_c')]);
    const server = new BaseCalmMcpServer({
      name: 'test',
      calm: fakeCalmClient(),
      groups: [g1, g2],
    });
    expect(server.listRegisteredTools().sort()).toEqual([
      'calm_a',
      'calm_b',
      'calm_c',
    ]);
  });

  test('empty groups → zero registered tools (valid scaffold state)', () => {
    const server = new BaseCalmMcpServer({
      name: 'test',
      calm: fakeCalmClient(),
    });
    expect(server.listRegisteredTools()).toEqual([]);
  });

  test('buildContext returns calm + logger from constructor', () => {
    const calm = fakeCalmClient();
    const logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };
    class Probe extends BaseCalmMcpServer {
      public probe(): ICalmHandlerContext {
        return this.buildContext();
      }
    }
    const server = new Probe({ name: 'test', calm, logger });
    const ctx = server.probe();
    expect(ctx.calm).toBe(calm);
    expect(ctx.logger).toBe(logger);
  });
});
