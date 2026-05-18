import { getLogsTool } from '../../tools/logs/getLogs';
import { postLogsTool } from '../../tools/logs/postLogs';
import { ctx, describeSandbox } from './_sandbox';

describeSandbox('logs tools (sandbox)', () => {
  // Sandbox does not document a public log provider name. Once a
  // provider+serviceId pair valid for the sandbox is known, replace
  // this `todo` with a real assertion.
  it.todo('fetches a log slice for a known sandbox provider');

  it('rejects missing provider with INVALID_ARGUMENT', async () => {
    await expect(
      getLogsTool.handler(await ctx(), {} as never),
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });

  // calm_logs_post is a write tool — actual ingestion intentionally
  // NOT exercised against the shared sandbox. Reachability is verified
  // via its three INVALID_ARGUMENT guards, which fire before any
  // network call.
  describe('post argument validation (no network)', () => {
    it('rejects missing useCase', async () => {
      await expect(
        postLogsTool.handler(await ctx(), {
          serviceId: 'svc',
          records: [],
        } as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    it('rejects missing serviceId', async () => {
      await expect(
        postLogsTool.handler(await ctx(), {
          useCase: 'uc',
          records: [],
        } as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    it('rejects missing records', async () => {
      await expect(
        postLogsTool.handler(await ctx(), {
          useCase: 'uc',
          serviceId: 'svc',
        } as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });
  });
});
