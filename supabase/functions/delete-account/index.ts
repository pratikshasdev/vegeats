// delete-account: permanently deletes the signed-in user.
//
// Removes their uploaded photos from storage, then deletes the auth user. The database cascades
// from there: profile, reviews, photo rows and reports are deleted; restaurants and dishes they
// added stay listed for everyone, with created_by cleared.
//
// POST /functions/v1/delete-account with the user's access token. No body.

import { createClient } from "npm:@supabase/supabase-js@2";

import { collectPhotoPaths } from "../_shared/account.ts";

const PHOTOS_BUCKET = "photos";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const { data: userData, error: authError } = await admin.auth.getUser(token);
  if (authError || !userData.user) return json({ error: "Unauthorized" }, 401);
  const userId = userData.user.id;

  // Every file this user uploaded: rows in public.photos plus anything left in their storage folder.
  const { data: rows, error: rowsError } = await admin.from("photos").select("storage_path").eq("user_id", userId);
  if (rowsError) return json({ error: rowsError.message }, 500);

  const storage = admin.storage.from(PHOTOS_BUCKET);
  const listed: string[] = [];
  const { data: folders } = await storage.list(userId, { limit: 1000 });
  for (const entry of folders ?? []) {
    if (entry.id) {
      listed.push(`${userId}/${entry.name}`);
      continue;
    }
    const { data: files } = await storage.list(`${userId}/${entry.name}`, { limit: 1000 });
    for (const f of files ?? []) if (f.id) listed.push(`${userId}/${entry.name}/${f.name}`);
  }

  const paths = collectPhotoPaths(userId, (rows ?? []).map((r) => r.storage_path), listed);
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await storage.remove(paths.slice(i, i + 100));
    if (error) return json({ error: `Couldn't remove photos: ${error.message}` }, 500);
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) return json({ error: deleteError.message }, 500);

  return json({ deleted: true, photosRemoved: paths.length });
});
