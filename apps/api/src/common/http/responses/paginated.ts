import type { PaginationMeta } from "@packages/contracts";

// Return from a controller to send { status: 'success', data, meta }
export class Paginated<T> {
  constructor(
    readonly items: T[],
    readonly meta: PaginationMeta,
  ) {}
}
