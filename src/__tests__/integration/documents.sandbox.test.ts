import { getDocumentTool } from '../../tools/documents/getDocument';
import { listDocumentsTool } from '../../tools/documents/listDocuments';
import { ctx, describeSandbox } from './_sandbox';

describeSandbox('documents tools (sandbox)', () => {
  it('lists documents (possibly empty in shared sandbox)', async () => {
    const res = await listDocumentsTool.handler(ctx(), { limit: 3 });
    expect(Array.isArray(res.items)).toBe(true);
  });

  it('chains list → get when documents exist', async () => {
    const list = await listDocumentsTool.handler(ctx(), { limit: 1 });
    if (list.items.length === 0) return;
    const uuid = (list.items[0] as { uuid?: string }).uuid;
    if (!uuid) return;
    const res = await getDocumentTool.handler(ctx(), { uuid });
    expect(res).toHaveProperty('uuid', uuid);
  });
});
