import { CalmApiError } from '@mcp-abap-adt/calm-client';
import { createDocumentTool } from '../../../tools/documents/createDocument';
import { deleteDocumentTool } from '../../../tools/documents/deleteDocument';
import { updateDocumentTool } from '../../../tools/documents/updateDocument';
import { mockCalm } from '../../helpers/mockCalm';

describe('document CRUD tools', () => {
  describe('calm_documents_create', () => {
    test('rejects when title missing', async () => {
      const { calm } = mockCalm(() => ({}));
      await expect(
        createDocumentTool.handler({ calm }, {} as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    test('forwards full payload to calm.documents.create', async () => {
      const { calm, calls } = mockCalm(() => ({ uuid: 'd1', title: 'T' }));
      const result = await createDocumentTool.handler(
        { calm },
        {
          title: 'T',
          content: 'body',
          projectId: 'P',
          typeCode: 'NOTE',
        },
      );
      expect(calls[0]).toMatchObject({
        service: 'documents',
        method: 'create',
        args: [
          { title: 'T', content: 'body', projectId: 'P', typeCode: 'NOTE' },
        ],
      });
      expect(result.uuid).toBe('d1');
    });

    test('ODATA_ERROR carries serviceCode', async () => {
      const { calm } = mockCalm(() =>
        CalmApiError.fromOData(400, { code: 'BAD', message: 'no' }),
      );
      await expect(
        createDocumentTool.handler({ calm }, { title: 'T' }),
      ).rejects.toMatchObject({ code: 'ODATA_ERROR', serviceCode: 'BAD' });
    });
  });

  describe('calm_documents_update', () => {
    test('rejects missing uuid', async () => {
      const { calm } = mockCalm(() => ({}));
      await expect(
        updateDocumentTool.handler({ calm }, { title: 'x' } as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    test('separates uuid from patch payload', async () => {
      const { calm, calls } = mockCalm(() => ({ uuid: 'd1' }));
      await updateDocumentTool.handler(
        { calm },
        { uuid: 'd1', statusCode: 'DONE', title: 'renamed' },
      );
      expect(calls[0]).toMatchObject({
        service: 'documents',
        method: 'update',
        args: ['d1', { statusCode: 'DONE', title: 'renamed' }],
      });
    });

    test('NOT_FOUND surfaces', async () => {
      const { calm } = mockCalm(() =>
        CalmApiError.fromNotFound('Document', 'd1'),
      );
      await expect(
        updateDocumentTool.handler({ calm }, { uuid: 'd1', title: 'x' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });

  describe('calm_documents_delete', () => {
    test('rejects missing uuid', async () => {
      const { calm } = mockCalm(() => ({}));
      await expect(
        deleteDocumentTool.handler({ calm }, {} as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    test('returns confirmation on success', async () => {
      const { calm, calls } = mockCalm(() => undefined);
      const result = await deleteDocumentTool.handler({ calm }, { uuid: 'd1' });
      expect(calls[0]).toMatchObject({
        service: 'documents',
        method: 'delete',
        args: ['d1'],
      });
      expect(result).toEqual({ deleted: true, uuid: 'd1' });
    });

    test('NOT_FOUND surfaces', async () => {
      const { calm } = mockCalm(() =>
        CalmApiError.fromNotFound('Document', 'd1'),
      );
      await expect(
        deleteDocumentTool.handler({ calm }, { uuid: 'd1' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });
});
