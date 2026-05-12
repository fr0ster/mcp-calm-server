import { getLogsTool } from '../../tools/logs/getLogs';
import { ctx, describeSandbox } from './_sandbox';

describeSandbox('logs tools (sandbox)', () => {
  // Sandbox does not document a public log provider name. Once a
  // provider+serviceId pair valid for the sandbox is known, replace
  // this `todo` with a real assertion.
  it.todo('fetches a log slice for a known sandbox provider');

  it('rejects missing provider with INVALID_ARGUMENT', async () => {
    await expect(getLogsTool.handler(ctx(), {} as never)).rejects.toMatchObject(
      { code: 'INVALID_ARGUMENT' },
    );
  });
});
