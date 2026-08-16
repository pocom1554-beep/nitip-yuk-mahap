import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BadgePercent, Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminGate } from "@/components/AdminGate";
import { useAuth } from "@/hooks/useAuth";
import { rupiah } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/promo")({
  head: () => ({
    meta: [
      { title: "Promo & Voucher — NitipYuk" },
      {
        name: "description",
        content: "Admin utama membuat promo belanja dan voucher potongan ongkos titip NitipYuk.",
      },
      { property: "og:title", content: "Promo & Voucher — NitipYuk" },
      { property: "og:description", content: "Kelola kode voucher dan promo belanja jasa titip." },
    ],
  }),
  component: () => (
    <AdminGate>
      <KelolaPromo />
    </AdminGate>
  ),
});

type Promo = {
  id: string;
  code: string;
  title: string;
  description: string;
  kind: string;
  value: number;
  min_spend: number;
  max_discount: number;
  quota: number;
  used_count: number;
  is_active: boolean;
  expires_at: string | null;
};

const empty: Promo = {
  id: "",
  code: "",
  title: "",
  description: "",
  kind: "persen",
  value: 10,
  min_spend: 0,
  max_discount: 0,
  quota: 0,
  used_count: 0,
  is_active: true,
  expires_at: null,
};

function KelolaPromo() {
  const { isOwner } = useAuth();
  const [rows, setRows] = useState<Promo[]>([]);
  const [form, setForm] = useState<Promo>({ ...empty });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("promos").select("*").order("created_at", { ascending: false });
    setRows((data ?? []) as unknown as Promo[]);
  };

  useEffect(() => {
    void load();
  }, []);

  if (!isOwner) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-bold">Khusus admin utama</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Hanya admin utama (admin01) yang bisa membuat promo dan voucher belanja.
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/admin">Kembali ke dasbor</Link>
        </Button>
      </main>
    );
  }

  const simpan = async () => {
    if (!form.code.trim()) {
      toast.error("Kode voucher wajib diisi");
      return;
    }
    setBusy(true);
    const payload = {
      code: form.code.trim().toUpperCase(),
      title: form.title.trim(),
      description: form.description.trim(),
      kind: form.kind,
      value: Number(form.value) || 0,
      min_spend: Number(form.min_spend) || 0,
      max_discount: Number(form.max_discount) || 0,
      quota: Number(form.quota) || 0,
      is_active: form.is_active,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    };
    const { error } = form.id
      ? await supabase.from("promos").update(payload).eq("id", form.id)
      : await supabase.from("promos").insert(payload);
    setBusy(false);
    if (error) {
      toast.error("Gagal menyimpan promo", { description: error.message });
      return;
    }
    toast.success(form.id ? "Promo diperbarui" : "Promo dibuat");
    setOpen(false);
    setForm({ ...empty });
    await load();
  };

  const hapus = async (p: Promo) => {
    if (!confirm(`Hapus promo ${p.code}?`)) return;
    const { error } = await supabase.from("promos").delete().eq("id", p.id);
    if (error) {
      toast.error("Gagal menghapus", { description: error.message });
      return;
    }
    toast.success("Promo dihapus");
    await load();
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 pb-16">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-black tracking-tight">Promo & voucher</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Voucher aktif otomatis tampil di beranda dan bisa dipakai konsumen saat checkout.
          </p>
        </div>
        <Button
          onClick={() => {
            setForm({ ...empty });
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Buat promo
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="surface-card mt-4 p-8 text-center text-sm text-muted-foreground">
          Belum ada promo. Buat voucher pertama untuk menarik pelanggan.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {rows.map((p) => (
            <article key={p.id} className="surface-card p-4">
              <div className="flex items-center gap-2">
                <BadgePercent className="h-4 w-4 text-primary" />
                <span className="font-display text-lg font-black tracking-wide">{p.code}</span>
                {p.is_active ? <Badge>Aktif</Badge> : <Badge variant="secondary">Nonaktif</Badge>}
              </div>
              <p className="mt-1 text-sm font-semibold">{p.title || "Tanpa judul"}</p>
              {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
              <p className="mt-2 text-sm font-bold text-primary">
                {p.kind === "persen" ? `Potongan ${p.value}%` : `Potongan ${rupiah(p.value)}`}
              </p>
              <p className="text-xs text-muted-foreground">
                Min. belanja {rupiah(p.min_spend)}
                {p.max_discount > 0 && ` · maks. ${rupiah(p.max_discount)}`}
                {p.quota > 0 && ` · kuota ${p.used_count}/${p.quota}`}
                {p.expires_at && ` · s/d ${new Date(p.expires_at).toLocaleDateString("id-ID")}`}
              </p>
              <div className="mt-3 flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setForm({
                      ...p,
                      expires_at: p.expires_at ? p.expires_at.slice(0, 10) : null,
                    });
                    setOpen(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" /> Ubah
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => void hapus(p)}>
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
            <DialogTitle>{form.id ? "Ubah promo" : "Buat promo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="pc">Kode voucher</Label>
              <Input
                id="pc"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                maxLength={24}
                placeholder="NITIPHEMAT"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pt">Judul promo</Label>
              <Input id="pt" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={80} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pdesc">Keterangan</Label>
              <Textarea
                id="pdesc"
                rows={2}
                maxLength={300}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pk">Jenis potongan</Label>
                <select
                  id="pk"
                  value={form.kind}
                  onChange={(e) => setForm({ ...form, kind: e.target.value })}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="persen">Persen (%)</option>
                  <option value="nominal">Nominal (Rp)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pv">Nilai potongan</Label>
                <Input id="pv" type="number" min={0} value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pm">Min. belanja (Rp)</Label>
                <Input id="pm" type="number" min={0} value={form.min_spend} onChange={(e) => setForm({ ...form, min_spend: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pmx">Maks. potongan (Rp)</Label>
                <Input id="pmx" type="number" min={0} value={form.max_discount} onChange={(e) => setForm({ ...form, max_discount: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pq">Kuota pemakaian (0 = tanpa batas)</Label>
                <Input id="pq" type="number" min={0} value={form.quota} onChange={(e) => setForm({ ...form, quota: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pe">Berlaku sampai</Label>
                <Input
                  id="pe"
                  type="date"
                  value={form.expires_at ?? ""}
                  onChange={(e) => setForm({ ...form, expires_at: e.target.value || null })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <Label htmlFor="pa">Promo aktif</Label>
              <Switch id="pa" checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => void simpan()} disabled={busy}>
              {busy ? "Menyimpan..." : "Simpan promo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
