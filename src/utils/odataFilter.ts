/**
 * Small helpers for building OData filter expressions safely from
 * user-provided strings.
 */

/**
 * Escape a string value for use inside OData single-quoted literals.
 * `don't` → `don''t`.
 */
export function escapeODataString(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Join multiple filter predicates with `and`. Undefined / empty
 * entries are skipped; if nothing is left, returns `undefined`.
 */
export function joinAndFilters(
  ...parts: (string | undefined)[]
): string | undefined {
  const kept = parts.filter((p): p is string => !!p && p.trim().length > 0);
  return kept.length === 0 ? undefined : kept.join(' and ');
}
