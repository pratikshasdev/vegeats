/**
 * The storage paths to delete for a user: their photo rows plus anything listed in their folder,
 * de-duplicated. Only paths inside `${userId}/` are kept, so a bad row can never delete
 * someone else's file.
 */
export function collectPhotoPaths(userId: string, rowPaths: (string | null)[], listedPaths: string[]): string[] {
  const prefix = `${userId}/`;
  const all = [...rowPaths, ...listedPaths].filter((p): p is string => !!p && p.startsWith(prefix) && !p.includes(".."));
  return [...new Set(all)];
}
