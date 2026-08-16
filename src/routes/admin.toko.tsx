import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Store, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminGate } from "@/components/AdminGate";
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
};

const empty: StoreRow = {
  id: "",
  name: "",
  description: "",
  address: "",
  open_hours: "",
  whatsapp: "",
};

function KelolaToko() {
  const [rows, setRows] = useState<StoreRow[]>([]);
  const [form, setForm] = useState<StoreRow>({ ...empty });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("stores").select("*").order("name");
    setRows((data ?? []) as unknown as StoreRow[]);
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
                <Store className="h-4 w-4 text-primary" /> {s.name}
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
