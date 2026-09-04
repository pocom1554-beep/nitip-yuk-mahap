import { useState } from "react";
import { toast } from "sonner";
import { ImageIcon, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBanners, type Banner } from "@/hooks/useBanners";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const TIPE = ["image/png", "image/jpeg"];

/** Panel kontrol banner (khusus admin): tambah, edit, hapus secara realtime. */
export function BannerAdminPanel() {
  const { banners, urls, loading } = useBanners(false);
  const [edit, setEdit] = useState<Banner | null>(null);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [aktif, setAktif] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setEdit(null);
    setTitle("");
    setSubtitle("");
    setSortOrder(0);
    setAktif(true);
    setFile(null);
  };

  const mulaiEdit = (b: Banner) => {
    setEdit(b);
    setTitle(b.title);
    setSubtitle(b.subtitle);
    setSortOrder(b.sort_order);
    setAktif(b.is_active);
    setFile(null);
  };

  const pilihFile = (f: File | null) => {
    if (f && !TIPE.includes(f.type)) {
      toast.error("Hanya file desain banner PNG atau JPG yang diizinkan");
      return;
    }
    setFile(f);
  };

  const unggah = async (f: File) => {
    const ext = f.type === "image/png" ? "png" : "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("banners").upload(path, f, { contentType: f.type });
    if (error) throw error;
    return path;
  };

  const simpan = async () => {
    if (!edit && !file) {
      toast.error("Unggah desain banner PNG atau JPG dulu");
      return;
    }
    setSaving(true);
    try {
      const image_path = file ? await unggah(file) : edit!.image_path;
      const payload = { title, subtitle, sort_order: sortOrder, is_active: aktif, image_path };
      if (edit) {
        const { error } = await supabase.from("banners").update(payload).eq("id", edit.id);
        if (error) throw error;
        if (file && edit.image_path !== image_path) {
          await supabase.storage.from("banners").remove([edit.image_path]);
        }
        toast.success("Banner diperbarui");
      } else {
        const { error } = await supabase.from("banners").insert(payload);
        if (error) throw error;
        toast.success("Banner ditambahkan");
      }
      reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan banner");
    } finally {
      setSaving(false);
    }
  };

  const hapus = async (b: Banner) => {
    const { error } = await supabase.from("banners").delete().eq("id", b.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.storage.from("banners").remove([b.image_path]);
    if (edit?.id === b.id) reset();
    toast.success("Banner dihapus");
  };

  return (
    <section className="surface-pop mt-6 p-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-xl font-black">Kontrol banner</h2>
          <p className="text-sm text-muted-foreground">
            Khusus admin. Tambah, ubah, atau hapus banner — carousel di atas ikut berubah realtime.
          </p>
        </div>
        {edit && (
          <Button variant="ghost" size="sm" onClick={reset}>
            <X className="h-4 w-4" /> Batal edit
          </Button>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="banner-title">Judul (opsional)</Label>
          <Input id="banner-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Promo akhir pekan" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="banner-sub">Subjudul (opsional)</Label>
          <Input id="banner-sub" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Gratis ongkir radius 3 km" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="banner-file">Desain banner (PNG / JPG)</Label>
          <Input
            id="banner-file"
            type="file"
            accept="image/png,image/jpeg"
            onChange={(e) => pilihFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="banner-order">Urutan tampil</Label>
          <Input
            id="banner-order"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch id="banner-active" checked={aktif} onCheckedChange={setAktif} />
          <Label htmlFor="banner-active">Tampilkan di carousel</Label>
        </div>
        <Button onClick={() => void simpan()} disabled={saving} className="font-bold">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {edit ? "Simpan perubahan" : "Tambah banner"}
        </Button>
      </div>

      <div className="mt-6 space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Daftar banner ({banners.length})
        </h3>
        {loading ? (
          <p className="text-sm text-muted-foreground">Memuat banner...</p>
        ) : banners.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada banner. Unggah desain pertamamu.</p>
        ) : (
          banners.map((b) => (
            <div key={b.id} className="surface-card flex items-center gap-3 p-3">
              <div className="h-14 w-24 shrink-0 overflow-hidden rounded-xl bg-muted">
                {urls[b.image_path] ? (
                  <img src={urls[b.image_path]} alt={b.title || "Banner"} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <ImageIcon className="h-4 w-4" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{b.title || "Tanpa judul"}</p>
                <p className="truncate text-xs text-muted-foreground">
                  Urutan {b.sort_order} · {b.is_active ? "Aktif" : "Nonaktif"}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => mulaiEdit(b)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Hapus banner ini?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Banner dan file desainnya akan dihapus permanen.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void hapus(b)}>Hapus</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
