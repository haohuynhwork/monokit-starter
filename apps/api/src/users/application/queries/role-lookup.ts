import type { Db } from "@packages/nest";

// Roles are few, so queries read them whole instead of joining. Includes
// deleted ones: a user may still show a role deleted after they got it
// (deleting is refused while a user has it, so this is only a safeguard).
export async function roleKeysById(db: Db): Promise<Map<bigint, string>> {
  const rows = await db.orm.public.Role.select("id", "key").all();
  return new Map(
    rows.map((r) => [
      r.id,
      r.key,
    ]),
  );
}

// Live roles only; the ids of the given keys (unknown keys are dropped)
export async function roleIdsByKey(
  db: Db,
  keys: readonly string[],
): Promise<bigint[]> {
  if (keys.length === 0) {
    return [];
  }
  const rows = await db.orm.public.Role.select("id")
    .where((r) =>
      r.key.in([
        ...keys,
      ]),
    )
    .where((r) => r.deletedAt.isNull())
    .all();
  return rows.map((r) => r.id);
}
