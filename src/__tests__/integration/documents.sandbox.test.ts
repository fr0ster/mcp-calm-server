import { createDocumentTool } from '../../tools/documents/createDocument';
import { deleteDocumentTool } from '../../tools/documents/deleteDocument';
import { getDocumentTool } from '../../tools/documents/getDocument';
import { listDocumentsTool } from '../../tools/documents/listDocuments';
import { updateDocumentTool } from '../../tools/documents/updateDocument';
import { ctx, describeSandbox } from './_sandbox';

describeSandbox('documents tools (sandbox)', () => {
  it('lists documents (possibly empty in shared sandbox)', async () => {
    const res = await listDocumentsTool.handler(await ctx(), { limit: 3 });
    expect(Array.isArray(res.items)).toBe(true);
  });

  it('chains list → get when documents exist', async () => {
    const list = await listDocumentsTool.handler(await ctx(), { limit: 1 });
    if (list.items.length === 0) return;
    const uuid = (list.items[0] as { uuid?: string }).uuid;
    if (!uuid) return;
    const res = await getDocumentTool.handler(await ctx(), { uuid });
    expect(res).toHaveProperty('uuid', uuid);
  });

  // CRUD mutations (create/update/delete) intentionally NOT exercised
  // against the shared sandbox. Reachability is checked via the
  // INVALID_ARGUMENT guard, which fires before any network call.
  describe('CRUD argument validation (no network)', () => {
    it('create rejects missing title', async () => {
      await expect(
        createDocumentTool.handler(await ctx(), {} as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    it('update rejects missing uuid', async () => {
      await expect(
        updateDocumentTool.handler(await ctx(), { title: 'x' } as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    it('delete rejects missing uuid', async () => {
      await expect(
        deleteDocumentTool.handler(await ctx(), {} as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });
  });
});
