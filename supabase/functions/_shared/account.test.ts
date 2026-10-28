import assert from "node:assert/strict";

import { collectPhotoPaths } from "./account.ts";

const uid = "11111111-1111-1111-1111-111111111111";

Deno.test("collectPhotoPaths merges rows and listing without duplicates", () => {
  const paths = collectPhotoPaths(uid, [`${uid}/r1/a.jpg`, null], [`${uid}/r1/a.jpg`, `${uid}/r2/b.jpg`]);
  assert.deepEqual(paths, [`${uid}/r1/a.jpg`, `${uid}/r2/b.jpg`]);
});

Deno.test("collectPhotoPaths never returns another user's files", () => {
  const paths = collectPhotoPaths(uid, ["someone-else/r1/a.jpg", `${uid}/../other/x.jpg`], [`${uid}x/r1/c.jpg`]);
  assert.deepEqual(paths, []);
});
