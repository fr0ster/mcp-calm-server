import { ALL_GROUPS, ALL_HANDLERS } from '../../../tools';

describe('ALL_GROUPS aggregation', () => {
  test('contains all 9 service groups', () => {
    const names = ALL_GROUPS.map((g) => g.getName()).sort();
    expect(names).toEqual([
      'analytics',
      'documents',
      'features',
      'hierarchy',
      'logs',
      'processMonitoring',
      'projects',
      'tasks',
      'testCases',
    ]);
  });

  test('tool names are unique across all services', () => {
    const names = ALL_HANDLERS.map((h) => h.toolDefinition.name);
    const seen = new Set<string>();
    for (const n of names) {
      expect(seen.has(n)).toBe(false);
      seen.add(n);
    }
  });

  test('every tool has a description ≥ 20 chars', () => {
    for (const h of ALL_HANDLERS) {
      expect(h.toolDefinition.description.length).toBeGreaterThanOrEqual(20);
    }
  });

  test('every tool name is namespaced under "calm_"', () => {
    for (const h of ALL_HANDLERS) {
      expect(h.toolDefinition.name).toMatch(/^calm_/);
    }
  });

  test('total tool count matches M4 target (23)', () => {
    expect(ALL_HANDLERS).toHaveLength(23);
  });
});
