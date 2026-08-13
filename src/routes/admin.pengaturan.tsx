import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminGate } from "@/components/AdminGate";
import { useAuth } from "@/hooks/useAuth";
import { rupiah } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/pengaturan")({
  head: () => ({
    meta: [
      { title: "Pengaturan Admin — NitipYuk" },
      { name: "description", content: "Atur ongkos titip per kilometer, nomor WhatsApp admin, dan daftar admin NitipYuk." },
      { property: "og:title", content: "Pengaturan Admin — NitipYuk" },
      { property: "og:description", content: "Atur tarif ongkos titip dan kelola slot admin." },
    ],
  }),
  component: () => (
    <AdminGate>
      <Pengaturan />
    </AdminGate>
  ),
});

type Row = { id: string; full_name: string; whatsapp: string; is_owner: boolean; isAdmin: boolean };

function Pengaturan() {
  const { isOwner, user, refresh } = useAuth();
  const [baseFee, setBaseFee] = useState(5000);
  const [perKm, setPerKm] = useState(2000);
  const [freeKm, setFreeKm] = useState(1);
  const [adminWa, setAdminWa] = useState("");
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);

  const loadUsers = async () => {
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, whatsapp, is_owner"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const adminIds = new Set((roles ?? []).filter((r) => r.role === "admin").map((r) => r.user_id));
    setRows(
      (profiles ?? []).map((p) => ({
        id: p.id,
        full_name: p.full_name,
        whatsapp: p.whatsapp,
        is_owner: p.is_owner,
        isAdmin: adminIds.has(p.id),
      })),
    );
  };

  useEffect(() => {
    void supabase
      .from("settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setBaseFee(Number(data.base_fee));
        setPerKm(Number(data.per_km_fee));
        setFreeKm(Number(data.free_km));
        setAdminWa(data.admin_whatsapp);
      });
    void loadUsers();
  }, []);

  const simpan = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("settings")
      .update({
        base_fee: baseFee,
        per_km_fee: perKm,
        free_km: freeKm,
        admin_whatsapp: adminWa.trim(),
      })
      .eq("id", 1);
    setBusy(false);
    if (error) {
      toast.error("Gagal menyimpan", { description: error.message });
      return;
    }
    toast.success("Pengaturan tersimpan");
  };

  const toggleAdmin = async (row: Row) => {
    if (row.isAdmin) {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", row.id)
        .eq("role", "admin");
      if (error) {
        toast.error("Gagal mencabut admin", { description: error.message });
        return;
      }
      toast.success(`${row.full_name} bukan admin lagi`);
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: row.id, role: "admin" });
      if (error) {
        toast.error("Gagal menambah admin", { description: error.message });
        return;
      }
      toast.success(`${row.full_name} kini admin`);
    }
    await loadUsers();
    if (row.id === user?.id) await refresh();
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 pb-16">
      <h1 className="text-2xl font-extrabold tracking-tight">Pengaturan</h1>

      <section className="surface-card mt-4 space-y-3 p-4">
        <h2 className="font-semibold">Ongkos titip</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="bf">Ongkos dasar</Label>
            <Input id="bf" type="number" min={0} value={baseFee} onChange={(e) => setBaseFee(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pk">Tarif per km</Label>
            <Input id="pk" type="number" min={0} value={perKm} onChange={(e) => setPerKm(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fk">Km gratis</Label>
            <Input id="fk" type="number" min={0} step="0.5" value={freeKm} onChange={(e) => setFreeKm(Number(e.target.value))} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Contoh: jarak 5 km → {rupiah(baseFee + Math.max(0, 5 - freeKm) * perKm)}
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="wa">Nomor WhatsApp admin</Label>
          <Input id="wa" value={adminWa} onChange={(e) => setAdminWa(e.target.value)} placeholder="08xxxxxxxxxx" maxLength={20} />
        </div>
        <Button onClick={() => void simpan()} disabled={busy}>
          {busy ? "Menyimpan..." : "Simpan pengaturan"}
        </Button>
      </section>

      <section className="surface-card mt-4 p-4">
        <h2 className="font-semibold">Slot admin</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {isOwner
            ? "Sebagai admin utama (admin01), kamu bisa menambah atau mencabut akses admin."
            : "Hanya admin utama (pendaftar pertama) yang bisa mengubah daftar admin."}
        </p>
        <div className="mt-3 divide-y divide-border">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{r.full_name || "Tanpa nama"}</p>
                <p className="text-xs text-muted-foreground">{r.whatsapp || "-"}</p>
              </div>
              <div className="flex items-center gap-2">
                {r.is_owner && <Badge variant="secondary">Admin utama</Badge>}
                {r.isAdmin && !r.is_owner && <Badge>Admin</Badge>}
                {isOwner && !r.is_owner && (
                  <Button size="sm" variant={r.isAdmin ? "ghost" : "outline"} onClick={() => void toggleAdmin(r)}>
                    {r.isAdmin ? (
                      <>
                        <ShieldOff className="h-3.5 w-3.5" /> Cabut
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-3.5 w-3.5" /> Jadikan admin
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
