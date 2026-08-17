import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Image as ImageIcon, Pencil, Plus, Store, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminGate } from "@/components/AdminGate";
import { resolveBucketUrl, uploadLogo } from "@/lib/images";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/toko")({
  head: () => ({
    meta: [
      { title: "Kelola Toko & Mitra — NitipYuk" },
      {
        name: "description",
        content: "Tambah dan ubah profil toko mitra NitipYuk beserta deskripsi, alamat, dan jam buka.",
      },
      { property: "og:title", content: "Kelola Toko & Mitra — NitipYuk" },
      { property: "og:description", content: "Atur deskripsi lengkap tiap toko mitra jasa titip." },
    ],
  }),
  component: () => (
    <AdminGate>
      <KelolaToko />
    </AdminGate>
  ),
});

type StoreRow = {
  id: string;
  name: string;
  description: string;
  address: string;
  open_hours: string;
  whatsapp: string;
  logo_url: string;
};

const empty: StoreRow = {
  id: "",
  name: "",
  description: "",
  address: "",
  open_hours: "",
  whatsapp: "",
  logo_url: "",
};

function KelolaToko() {
  const [rows, setRows] = useState<StoreRow[]>([]);
  const [form, setForm] = useState<StoreRow>({ ...empty });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [logos, setLogos] = useState<Record<string, string>>({});
  const [formLogo, setFormLogo] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data } = await supabase.from("stores").select("*").order("name");
    const list = (data ?? []) as unknown as StoreRow[];
    setRows(list);
    const entries = await Promise.all(
      list
        .filter((r) => r.logo_url)
        .map(async (r) => [r.logo_url, await resolveBucketUrl("branding", r.logo_url)] as const),
    );
    setLogos(Object.fromEntries(entries.filter(([, v]) => v)) as Record<string, string>);
  };

  const pilihLogo = async (file: File) => {
    setBusy(true);
    try {
      const path = await uploadLogo(file);
      setForm((f) => ({ ...f, logo_url: path }));
      setFormLogo(await resolveBucketUrl("branding", path));
      toast.success("Logo toko terunggah, jangan lupa simpan");
    } catch (e) {
      toast.error("Gagal mengunggah logo", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const simpan = async () => {
    if (!form.name.trim()) {
      toast.error("Nama toko wajib diisi");
      return;
    }
    setBusy(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      address: form.address.trim(),
      open_hours: form.open_hours.trim(),
      whatsapp: form.whatsapp.trim(),
      logo_url: form.logo_url || "",
    };
    const { error } = form.id
      ? await supabase.from("stores").update(payload).eq("id", form.id)
      : await supabase.from("stores").insert(payload);
    setBusy(false);
    if (error) {
      toast.error("Gagal menyimpan toko", { description: error.message });
      return;
    }
    toast.success(form.id ? "Toko diperbarui" : "Toko ditambahkan");
    setOpen(false);
    setForm({ ...empty });
    await load();
  };

  const hapus = async (row: StoreRow) => {
    if (!confirm(`Hapus profil toko "${row.name}"?`)) return;
    const { error } = await supabase.from("stores").delete().eq("id", row.id);
    if (error) {
      toast.error("Gagal menghapus", { description: error.message });
      return;
    }
    toast.success("Profil toko dihapus");
    await load();
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 pb-16">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-black tracking-tight">Toko & mitra</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Deskripsi toko akan tampil di halaman detail toko untuk konsumen.
          </p>
        </div>
        <Button
          onClick={() => {
            setForm({ ...empty });
            setFormLogo(null);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Tambah
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="surface-card mt-4 p-8 text-center text-sm text-muted-foreground">
          Belum ada profil toko. Nama toko harus sama persis dengan yang dipakai di katalog barang.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {rows.map((s) => (
            <article key={s.id} className="surface-card p-4">
              <p className="flex items-center gap-2 text-base font-bold">
                {s.logo_url && logos[s.logo_url] ? (
                  <img
                    src={logos[s.logo_url]}
                    alt={`Logo ${s.name}`}
                    className="h-9 w-9 rounded-xl border border-border object-cover"
                  />
                ) : (
                  <Store className="h-4 w-4 text-primary" />
                )}
                {s.name}
              </p>
              {s.description && (
                <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{s.description}</p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                {[s.address, s.open_hours, s.whatsapp].filter(Boolean).join(" · ") || "Detail belum diisi"}
              </p>
              <div className="mt-3 flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setForm(s);
                    setFormLogo(s.logo_url ? logos[s.logo_url] ?? null : null);
                    setOpen(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" /> Ubah
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => void hapus(s)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Ubah toko" : "Tambah toko"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted">
                {formLogo ? (
                  <img src={formLogo} alt="Logo toko" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
                <Upload className="h-4 w-4" /> Unggah logo toko
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void pilihLogo(f);
                  e.target.value = "";
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tn">Nama toko/mitra</Label>
              <Input
                id="tn"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                maxLength={80}
                placeholder="Contoh: Toko Berkah"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="td">Deskripsi toko</Label>
              <Textarea
                id="td"
                rows={4}
                maxLength={800}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Jual sembako, jajanan, dan kebutuhan harian..."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ta">Alamat toko</Label>
              <Input id="ta" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} maxLength={160} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="to">Jam buka</Label>
              <Input
                id="to"
                value={form.open_hours}
                onChange={(e) => setForm({ ...form, open_hours: e.target.value })}
                maxLength={80}
                placeholder="07.00 - 21.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tw">WhatsApp toko</Label>
              <Input id="tw" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} maxLength={20} />
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
