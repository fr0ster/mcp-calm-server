import { CalmApiError } from '@mcp-abap-adt/calm-client';
import { createFeatureTool } from '../../../tools/features/createFeature';
import { deleteFeatureTool } from '../../../tools/features/deleteFeature';
import { getFeatureTool } from '../../../tools/features/getFeature';
import { getFeatureByDisplayIdTool } from '../../../tools/features/getFeatureByDisplayId';
import { updateFeatureTool } from '../../../tools/features/updateFeature';
import { CalmToolError } from '../../../utils';
import { mockCalmForFeatures } from '../../helpers/mockCalm';

describe('feature CRUD tools', () => {
  describe('calm_features_get', () => {
    test('rejects missing uuid with INVALID_ARGUMENT', async () => {
      const { calm } = mockCalmForFeatures(() => ({}));
      await expect(
        getFeatureTool.handler({ calm }, {} as never),
      ).rejects.toBeInstanceOf(CalmToolError);
    });

    test('passes uuid through to calm.getFeatures().get', async () => {
      const { calm, calls } = mockCalmForFeatures(() => ({
        uuid: 'u1',
        title: 'T',
      }));
      const result = await getFeatureTool.handler({ calm }, { uuid: 'u1' });
      expect(calls[0]).toMatchObject({ method: 'get', args: ['u1'] });
      expect(result).toEqual({ uuid: 'u1', title: 'T' });
    });

    test('translates CalmApiError NOT_FOUND', async () => {
      const { calm } = mockCalmForFeatures(() =>
        CalmApiError.fromNotFound('Feature', 'u1'),
      );
      await expect(
        getFeatureTool.handler({ calm }, { uuid: 'u1' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });

  describe('calm_features_get_by_display_id', () => {
    test('rejects missing displayId', async () => {
      const { calm } = mockCalmForFeatures(() => ({}));
      await expect(
        getFeatureByDisplayIdTool.handler({ calm }, {} as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    test('passes displayId through', async () => {
      const { calm, calls } = mockCalmForFeatures(() => ({
        uuid: 'u1',
        displayId: '6-123',
      }));
      const result = await getFeatureByDisplayIdTool.handler(
        { calm },
        { displayId: '6-123' },
      );
      expect(calls[0]).toMatchObject({
        method: 'getByDisplayId',
        args: ['6-123'],
      });
      expect(result.displayId).toBe('6-123');
    });

    test('NOT_FOUND when collection empty (delegated from client)', async () => {
      const { calm } = mockCalmForFeatures(() =>
        CalmApiError.fromNotFound('Feature', '6-999'),
      );
      await expect(
        getFeatureByDisplayIdTool.handler({ calm }, { displayId: '6-999' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });

  describe('calm_features_create', () => {
    test('rejects when title missing', async () => {
      const { calm } = mockCalmForFeatures(() => ({}));
      await expect(
        createFeatureTool.handler({ calm }, { projectId: 'P' } as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    test('rejects when projectId missing', async () => {
      const { calm } = mockCalmForFeatures(() => ({}));
      await expect(
        createFeatureTool.handler({ calm }, { title: 'T' } as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    test('forwards full payload to calm.create', async () => {
      const { calm, calls } = mockCalmForFeatures(() => ({
        uuid: 'new',
        displayId: '6-0',
      }));
      const result = await createFeatureTool.handler(
        { calm },
        {
          title: 'T',
          projectId: 'P',
          description: 'd',
          priorityCode: 'HIGH',
        },
      );
      expect(calls[0]).toMatchObject({
        method: 'create',
        args: [
          {
            title: 'T',
            projectId: 'P',
            description: 'd',
            priorityCode: 'HIGH',
          },
        ],
      });
      expect(result.uuid).toBe('new');
    });

    test('ODATA_ERROR carries serviceCode to LLM', async () => {
      const { calm } = mockCalmForFeatures(() =>
        CalmApiError.fromOData(400, { code: 'MISSING', message: 'need scope' }),
      );
      await expect(
        createFeatureTool.handler({ calm }, { title: 'T', projectId: 'P' }),
      ).rejects.toMatchObject({ code: 'ODATA_ERROR', serviceCode: 'MISSING' });
    });
  });

  describe('calm_features_update', () => {
    test('rejects missing uuid', async () => {
      const { calm } = mockCalmForFeatures(() => ({}));
      await expect(
        updateFeatureTool.handler({ calm }, { title: 'x' } as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    test('separates uuid from patch payload', async () => {
      const { calm, calls } = mockCalmForFeatures(() => ({ uuid: 'u1' }));
      await updateFeatureTool.handler(
        { calm },
        { uuid: 'u1', statusCode: 'DONE', title: 'renamed' },
      );
      expect(calls[0]).toMatchObject({
        method: 'update',
        args: ['u1', { statusCode: 'DONE', title: 'renamed' }],
      });
    });
  });

  describe('calm_features_delete', () => {
    test('rejects missing uuid', async () => {
      const { calm } = mockCalmForFeatures(() => ({}));
      await expect(
        deleteFeatureTool.handler({ calm }, {} as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    test('returns confirmation object on success', async () => {
      const { calm, calls } = mockCalmForFeatures(() => undefined);
      const result = await deleteFeatureTool.handler({ calm }, { uuid: 'u1' });
      expect(calls[0]).toMatchObject({ method: 'delete', args: ['u1'] });
      expect(result).toEqual({ deleted: true, uuid: 'u1' });
    });

    test('NOT_FOUND surfaces for missing uuid', async () => {
      const { calm } = mockCalmForFeatures(() =>
        CalmApiError.fromNotFound('Feature', 'u1'),
      );
      await expect(
        deleteFeatureTool.handler({ calm }, { uuid: 'u1' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });
});
