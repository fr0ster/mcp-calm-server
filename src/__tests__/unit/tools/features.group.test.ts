import { FEATURES_GROUP, FEATURES_HANDLERS } from '../../../tools/features';

describe('FEATURES group registration', () => {
  test('group is named "features"', () => {
    expect(FEATURES_GROUP.getName()).toBe('features');
  });

  test('exposes all 8 handlers', () => {
    expect(FEATURES_HANDLERS).toHaveLength(8);
  });

  test('tool names are namespaced under calm_features_*', () => {
    const names = FEATURES_HANDLERS.map((h) => h.toolDefinition.name).sort();
    expect(names).toEqual([
      'calm_features_create',
      'calm_features_delete',
      'calm_features_get',
      'calm_features_get_by_display_id',
      'calm_features_list',
      'calm_features_list_priorities',
      'calm_features_list_statuses',
      'calm_features_update',
    ]);
  });

  test('every handler has a non-empty description', () => {
    for (const h of FEATURES_HANDLERS) {
      expect(h.toolDefinition.description.length).toBeGreaterThan(10);
    }
  });

  test('every handler exposes a valid JSON Schema inputSchema', () => {
    for (const h of FEATURES_HANDLERS) {
      const s = h.toolDefinition.inputSchema as { type?: string };
      expect(s.type).toBe('object');
    }
  });
});
