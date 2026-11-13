import "server-only";
import { z } from "zod";
import { exec, query, queryOne } from "./db";
import { decrypt, encrypt } from "./crypto";
import { birthSchema } from "@/lib/astro";

/** Saved birth details ("Me", "Wife", "Son"…) — whole record encrypted, owned by one account. */
export const profileSchema = birthSchema.extend({ label: z.string().trim().min(1).max(24).regex(/^[\p{L}\p{N} .'-]+$/u, "Use letters and numbers") });
export type Profile = z.infer<typeof profileSchema>;

export async function listProfiles(userId: number) {
  const rows = await query<{ id: number; data_enc: string; updated_at: Date }>("SELECT id, data_enc, updated_at FROM birth_profiles WHERE user_id = ? ORDER BY id", [userId]);
  const out: (Profile & { id: number })[] = [];
  for (const r of rows) {
    try {
      out.push({ id: r.id, ...(JSON.parse(await decrypt(r.data_enc)) as Profile) });
    } catch {}
  }
  return out;
}

export async function addProfile(userId: number, p: Profile, max: number) {
  const n = await queryOne<{ n: number }>("SELECT COUNT(*) n FROM birth_profiles WHERE user_id = ?", [userId]);
  if (Number(n?.n || 0) >= max) return null;
  const r = await exec("INSERT INTO birth_profiles (user_id, data_enc) VALUES (?, ?)", [userId, await encrypt(JSON.stringify(p))]);
  return r.insertId;
}

export async function updateProfile(userId: number, id: number, p: Profile) {
  const r = await exec("UPDATE birth_profiles SET data_enc = ? WHERE id = ? AND user_id = ?", [await encrypt(JSON.stringify(p)), id, userId]);
  return r.affectedRows === 1;
}

export async function deleteProfile(userId: number, id: number) {
  const r = await exec("DELETE FROM birth_profiles WHERE id = ? AND user_id = ?", [id, userId]);
  return r.affectedRows === 1;
}
