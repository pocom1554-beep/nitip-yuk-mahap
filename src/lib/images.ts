import { supabase } from "@/integrations/supabase/client";

/**
 * Foto produk disimpan di bucket privat. Untuk menampilkannya kita buat
 * signed URL sementara. Kalau nilainya sudah berupa URL http, pakai langsung.
 */
export async function resolveImageUrls(paths: (string | null | undefined)[]): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  const storagePaths: string[] = [];

  for (const p of paths) {
    if (!p) continue;
    if (p.startsWith("http")) map[p] = p;
    else if (!storagePaths.includes(p)) storagePaths.push(p);
  }

  if (storagePaths.length) {
    const { data } = await supabase.storage.from("products").createSignedUrls(storagePaths, 60 * 60 * 6);
    data?.forEach((d) => {
      if (d.path && d.signedUrl) map[d.path] = d.signedUrl;
    });
  }
  return map;
}

export async function uploadProductImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("products").upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

/** Signed URL untuk satu berkas pada bucket privat mana pun. */
export async function resolveBucketUrl(bucket: string, path?: string | null): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 6);
  return data?.signedUrl ?? null;
}

/** Unggah foto profil ke folder milik pengguna. */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
}

/** Unggah logo situs (khusus admin utama). */
export async function uploadLogo(file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "png";
  const path = `logo-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("branding").upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
}
