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
