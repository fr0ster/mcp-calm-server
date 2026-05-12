import { CalmApiError } from '@mcp-abap-adt/calm-client';
import { createExternalReferenceTool } from '../../../tools/features/createExternalReference';
import { deleteExternalReferenceTool } from '../../../tools/features/deleteExternalReference';
import { mockCalm } from '../../helpers/mockCalm';

describe('feature external-reference tools', () => {
  describe('calm_features_create_external_reference', () => {
    test('rejects missing id', async () => {
      const { calm } = mockCalm(() => ({}));
      await expect(
        createExternalReferenceTool.handler({ calm }, {
          parentUuid: 'f1',
          name: 'N',
        } as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    test('rejects missing parentUuid', async () => {
      const { calm } = mockCalm(() => ({}));
      await expect(
        createExternalReferenceTool.handler({ calm }, {
          id: 'JIRA-1',
          name: 'N',
        } as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    test('rejects missing name', async () => {
      const { calm } = mockCalm(() => ({}));
      await expect(
        createExternalReferenceTool.handler({ calm }, {
          id: 'JIRA-1',
          parentUuid: 'f1',
        } as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    test('forwards full payload to calm.features.createExternalReference', async () => {
      const { calm, calls } = mockCalm(() => ({
        id: 'JIRA-1',
        name: 'Linked Jira',
      }));
      const result = await createExternalReferenceTool.handler(
        { calm },
        {
          id: 'JIRA-1',
          parentUuid: 'f1',
          name: 'Linked Jira',
          url: 'https://example.atlassian.net/browse/JIRA-1',
        },
      );
      expect(calls[0]).toMatchObject({
        service: 'features',
        method: 'createExternalReference',
        args: [
          {
            id: 'JIRA-1',
            parentUuid: 'f1',
            name: 'Linked Jira',
            url: 'https://example.atlassian.net/browse/JIRA-1',
          },
        ],
      });
      expect(result.id).toBe('JIRA-1');
    });

    test('ODATA_ERROR carries serviceCode', async () => {
      const { calm } = mockCalm(() =>
        CalmApiError.fromOData(400, { code: 'BAD', message: 'no' }),
      );
      await expect(
        createExternalReferenceTool.handler(
          { calm },
          { id: 'X', parentUuid: 'f1', name: 'N' },
        ),
      ).rejects.toMatchObject({ code: 'ODATA_ERROR', serviceCode: 'BAD' });
    });
  });

  describe('calm_features_delete_external_reference', () => {
    test('rejects missing id', async () => {
      const { calm } = mockCalm(() => ({}));
      await expect(
        deleteExternalReferenceTool.handler({ calm }, {
          parentUuid: 'f1',
        } as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    test('rejects missing parentUuid', async () => {
      const { calm } = mockCalm(() => ({}));
      await expect(
        deleteExternalReferenceTool.handler({ calm }, {
          id: 'JIRA-1',
        } as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    test('forwards id + parentUuid positionally', async () => {
      const { calm, calls } = mockCalm(() => undefined);
      const result = await deleteExternalReferenceTool.handler(
        { calm },
        { id: 'JIRA-1', parentUuid: 'f1' },
      );
      expect(calls[0]).toMatchObject({
        service: 'features',
        method: 'deleteExternalReference',
        args: ['JIRA-1', 'f1'],
      });
      expect(result).toEqual({
        deleted: true,
        id: 'JIRA-1',
        parentUuid: 'f1',
      });
    });

    test('NOT_FOUND surfaces', async () => {
      const { calm } = mockCalm(() =>
        CalmApiError.fromNotFound('ExternalReference', 'JIRA-1'),
      );
      await expect(
        deleteExternalReferenceTool.handler(
          { calm },
          { id: 'JIRA-1', parentUuid: 'f1' },
        ),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });
});
