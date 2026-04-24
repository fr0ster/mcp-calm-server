import { escapeODataString, joinAndFilters } from '../../../utils/odataFilter';

describe('escapeODataString', () => {
  test("doubles single quotes: don't → don''t", () => {
    expect(escapeODataString("don't")).toBe("don''t");
  });
  test('no quotes → unchanged', () => {
    expect(escapeODataString('plain')).toBe('plain');
  });
});

describe('joinAndFilters', () => {
  test('joins with " and "', () => {
    expect(joinAndFilters('a eq 1', 'b eq 2')).toBe('a eq 1 and b eq 2');
  });
  test('skips undefined / empty', () => {
    expect(joinAndFilters('a eq 1', undefined, '', '   ', 'b eq 2')).toBe(
      'a eq 1 and b eq 2',
    );
  });
  test('all empty → undefined', () => {
    expect(joinAndFilters(undefined, '')).toBeUndefined();
  });
});
