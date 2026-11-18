type Node = {
  id: string;
  parentId: string | null;
  name: string;
  position: number;
};

// Flat list -> depth-first order with depth, children by position then name.
// Used for categories and regions.
export function categoryTree<T extends Node>(
  categories: T[],
): (T & {
  depth: number;
})[] {
  const byParent = new Map<string | null, T[]>();
  for (const c of categories) {
    const key = c.parentId;
    byParent.set(key, [
      ...(byParent.get(key) ?? []),
      c,
    ]);
  }
  const out: (T & {
    depth: number;
  })[] = [];
  const seen = new Set<string>();
  const walk = (parentId: string | null, depth: number) => {
    const children = (byParent.get(parentId) ?? []).sort(
      (a, b) => a.position - b.position || a.name.localeCompare(b.name),
    );
    for (const c of children) {
      if (seen.has(c.id)) {
        continue;
      }
      seen.add(c.id);
      out.push({
        ...c,
        depth,
      });
      walk(c.id, depth + 1);
    }
  };
  walk(null, 0);
  // Orphans (parent missing) at the end
  for (const c of categories) {
    if (!seen.has(c.id)) {
      out.push({
        ...c,
        depth: 0,
      });
    }
  }
  return out;
}
