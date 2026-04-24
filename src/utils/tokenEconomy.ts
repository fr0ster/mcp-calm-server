/**
 * Token-economy helpers. LLM context is expensive — every list tool
 * should cap result size, trim unrequested fields, and expose the
 * count so the LLM can decide whether to paginate.
 */

export const DEFAULT_LIST_LIMIT = 20;
export const MAX_LIST_LIMIT = 200;

/**
 * Clamp a user-provided limit to sane bounds for LLM list-tool
 * responses. `undefined` → `DEFAULT_LIST_LIMIT`; non-positive → 1;
 * over `MAX_LIST_LIMIT` → capped.
 */
export function clampListLimit(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_LIST_LIMIT;
  if (!Number.isFinite(limit) || limit < 1) return 1;
  if (limit > MAX_LIST_LIMIT) return MAX_LIST_LIMIT;
  return Math.floor(limit);
}

/**
 * Shape of a compact list-tool response — items + count hint. Keeping
 * OData metadata (`@odata.context`, nextLink) out of the LLM's view.
 */
export interface IListResponse<T> {
  items: T[];
  /** Total count if the caller requested `$count=true`; otherwise undefined. */
  count?: number;
  /** Index of the next page (for follow-up calls). */
  nextOffset?: number;
}

/**
 * Normalize an OData-style collection (`{ value, @odata.count }`) into
 * the flat shape we return to the LLM.
 */
export function toListResponse<T>(
  collection: {
    value: T[];
    '@odata.count'?: number;
  },
  opts: { limit: number; offset: number },
): IListResponse<T> {
  const items = collection.value ?? [];
  const count = collection['@odata.count'];
  const nextOffset =
    items.length === opts.limit ? opts.offset + opts.limit : undefined;
  return { items, count, nextOffset };
}
