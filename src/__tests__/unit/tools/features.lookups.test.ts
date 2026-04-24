import { CalmApiError } from '@mcp-abap-adt/calm-client';
import { listFeaturePrioritiesTool } from '../../../tools/features/listFeaturePriorities';
import { listFeatureStatusesTool } from '../../../tools/features/listFeatureStatuses';
import { mockCalmForFeatures } from '../../helpers/mockCalm';

describe('feature lookup tools', () => {
  describe('calm_features_list_statuses', () => {
    test('unwraps collection.value into items[]', async () => {
      const { calm } = mockCalmForFeatures(() => ({
        value: [
          { code: 'OPEN', name: 'Open' },
          { code: 'CLOSED', name: 'Closed' },
        ],
      }));
      const result = await listFeatureStatusesTool.handler({ calm }, {});
      expect(result.items).toEqual([
        { code: 'OPEN', name: 'Open' },
        { code: 'CLOSED', name: 'Closed' },
      ]);
    });

    test('empty response → empty items', async () => {
      const { calm } = mockCalmForFeatures(() => ({ value: [] }));
      const result = await listFeatureStatusesTool.handler({ calm }, {});
      expect(result.items).toEqual([]);
    });

    test('NETWORK error maps through', async () => {
      const { calm } = mockCalmForFeatures(() =>
        CalmApiError.fromNetwork(new Error('off')),
      );
      await expect(
        listFeatureStatusesTool.handler({ calm }, {}),
      ).rejects.toMatchObject({ code: 'NETWORK' });
    });
  });

  describe('calm_features_list_priorities', () => {
    test('unwraps collection.value into items[]', async () => {
      const { calm } = mockCalmForFeatures(() => ({
        value: [{ code: 'HIGH', name: 'High' }],
      }));
      const result = await listFeaturePrioritiesTool.handler({ calm }, {});
      expect(result.items).toEqual([{ code: 'HIGH', name: 'High' }]);
    });

    test('takes no args (empty inputSchema properties)', () => {
      const schema = listFeaturePrioritiesTool.toolDefinition.inputSchema as {
        type: string;
        properties: Record<string, unknown>;
      };
      expect(schema.type).toBe('object');
      expect(Object.keys(schema.properties)).toHaveLength(0);
    });
  });
});
