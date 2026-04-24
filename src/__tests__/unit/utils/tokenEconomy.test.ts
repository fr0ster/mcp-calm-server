import {
  clampListLimit,
  DEFAULT_LIST_LIMIT,
  MAX_LIST_LIMIT,
  toListResponse,
} from '../../../utils/tokenEconomy';

describe('clampListLimit', () => {
  test('undefined → default', () => {
    expect(clampListLimit(undefined)).toBe(DEFAULT_LIST_LIMIT);
  });
  test('zero / negative → 1', () => {
    expect(clampListLimit(0)).toBe(1);
    expect(clampListLimit(-5)).toBe(1);
  });
  test('over max → MAX_LIST_LIMIT', () => {
    expect(clampListLimit(1_000_000)).toBe(MAX_LIST_LIMIT);
  });
  test('fractional → floored', () => {
    expect(clampListLimit(10.9)).toBe(10);
  });
  test('normal → passthrough', () => {
    expect(clampListLimit(50)).toBe(50);
  });
});

describe('toListResponse', () => {
  test('exposes count from @odata.count', () => {
    const r = toListResponse(
      { value: [{ a: 1 }], '@odata.count': 42 },
      { limit: 20, offset: 0 },
    );
    expect(r).toEqual({ items: [{ a: 1 }], count: 42, nextOffset: undefined });
  });
  test('nextOffset when page is full', () => {
    const items = Array.from({ length: 5 }, (_, i) => ({ i }));
    const r = toListResponse({ value: items }, { limit: 5, offset: 10 });
    expect(r.nextOffset).toBe(15);
  });
  test('missing value array → empty items', () => {
    const r = toListResponse(
      { value: undefined as never },
      { limit: 5, offset: 0 },
    );
    expect(r.items).toEqual([]);
  });
});
