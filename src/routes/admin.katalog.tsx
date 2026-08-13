import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ImageIcon, Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminGate } from "@/components/AdminGate";
import { resolveImageUrls, uploadProductImage } from "@/lib/images";
import { rupiah } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/katalog")({
  head: () => ({
    meta: [
      { title: "Kelola Katalog — NitipYuk" },
      { name: "description", content: "Tambah, ubah, dan hapus barang katalog jasa titip NitipYuk." },
      { property: "og:title", content: "Kelola Katalog — NitipYuk" },
      { property: "og:description", content: "Kelola daftar barang beserta foto dan harga." },
    ],
  }),
  component: () => (
    <AdminGate>
      <KelolaKatalog />
    </AdminGate>
  ),
});

type Product = {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  image_url: string | null;
  is_available: boolean;
};

const empty = {
  id: "",
  name: "",
  description: "",
  category: "Sembako",
  price: 0,
  image_url: null as string | null,
  is_available: true,
};

function KelolaKatalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [images, setImages] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Product>({ ...empty });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    const list = (data ?? []) as unknown as Product[];
    setProducts(list);
    setImages(await resolveImageUrls(list.map((p) => p.image_url)));
  };

  useEffect(() => {
    void load();
  }, []);

  const simpan = async () => {
    if (!form.name.trim()) {
      toast.error("Nama barang wajib diisi");
      return;
    }
    setBusy(true);
    try {
      let imagePath = form.image_url;
      if (file) imagePath = await uploadProductImage(file);
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category.trim() || "Lainnya",
        price: Number(form.price) || 0,
        image_url: imagePath,
        is_available: form.is_available,
      };
      const { error } = form.id
        ? await supabase.from("products").update(payload).eq("id", form.id)
        : await supabase.from("products").insert(payload);
      if (error) throw error;
      toast.success(form.id ? "Barang diperbarui" : "Barang ditambahkan");
      setOpen(false);
      setFile(null);
      setForm({ ...empty });
      await load();
    } catch (e) {
      toast.error("Gagal menyimpan", { description: e instanceof Error ? e.message : "Coba lagi" });
    } finally {
      setBusy(false);
    }
  };

  const hapus = async (p: Product) => {
    if (!confirm(`Hapus "${p.name}" dari katalog?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) {
      toast.error("Gagal menghapus", { description: error.message });
      return;
    }
    toast.success("Barang dihapus");
    await load();
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 pb-16">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">Kelola katalog</h1>
        <Button
          onClick={() => {
            setForm({ ...empty });
            setFile(null);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Tambah
        </Button>
      </div>

      {products.length === 0 ? (
        <p className="surface-card mt-4 p-8 text-center text-sm text-muted-foreground">
          Belum ada barang di katalog.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {products.map((p) => (
            <article key={p.id} className="surface-card flex gap-3 p-3">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                {p.image_url && images[p.image_url] ? (
                  <img src={images[p.image_url]} alt={p.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {p.category}
                </p>
                <h2 className="truncate text-sm font-semibold">{p.name}</h2>
                <p className="text-sm font-bold text-primary">{rupiah(p.price)}</p>
                <p className="text-xs text-muted-foreground">
                  {p.is_available ? "Tersedia" : "Kosong"}
                </p>
                <div className="mt-2 flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setForm(p);
                      setFile(null);
                      setOpen(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Ubah
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => void hapus(p)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Ubah barang" : "Tambah barang"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="pn">Nama barang</Label>
              <Input id="pn" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pc">Kategori</Label>
              <Input id="pc" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} maxLength={40} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pp">Harga (Rp)</Label>
              <Input
                id="pp"
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pd">Deskripsi</Label>
              <Textarea id="pd" rows={3} maxLength={500} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pf">Foto barang</Label>
              <Input id="pf" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <Label htmlFor="pa">Tersedia</Label>
              <Switch id="pa" checked={form.is_available} onCheckedChange={(v) => setForm({ ...form, is_available: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => void simpan()} disabled={busy}>
              {busy ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
