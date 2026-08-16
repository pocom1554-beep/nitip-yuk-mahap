import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminGate } from "@/components/AdminGate";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/admin/tim")({
  head: () => ({
    meta: [
      { title: "Jabatan Tim Admin — NitipYuk" },
      {
        name: "description",
        content: "Admin utama menetapkan jabatan tim NitipYuk seperti kurir, manager, dan kepala pengembangan.",
      },
      { property: "og:title", content: "Jabatan Tim Admin — NitipYuk" },
      { property: "og:description", content: "Atur keterangan jabatan tiap admin NitipYuk." },
    ],
  }),
  component: () => (
    <AdminGate>
      <KelolaTim />
    </AdminGate>
  ),
});

type Anggota = {
  id: string;
  full_name: string;
  whatsapp: string;
  is_owner: boolean;
  job_title: string;
  bio: string;
};

const SARAN = ["Kurir", "Kepala tim pengembangan", "Manager", "Admin katalog", "Customer service"];

function KelolaTim() {
  const { isOwner } = useAuth();
  const [rows, setRows] = useState<Anggota[]>([]);
  const [busyId, setBusyId] = useState("");

  const load = async () => {
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, whatsapp, is_owner, job_title, bio"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const adminIds = new Set((roles ?? []).filter((r) => r.role === "admin").map((r) => r.user_id));
    setRows(((profiles ?? []) as unknown as Anggota[]).filter((p) => adminIds.has(p.id)));
  };

  useEffect(() => {
    void load();
  }, []);

  if (!isOwner) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-bold">Khusus admin utama</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Hanya admin utama (admin01) yang bisa mengubah keterangan jabatan tim.
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/admin">Kembali ke dasbor</Link>
        </Button>
      </main>
    );
  }

  const simpan = async (a: Anggota) => {
    setBusyId(a.id);
    const { error } = await supabase
      .from("profiles")
      .update({ job_title: a.job_title.trim(), bio: a.bio.trim() })
      .eq("id", a.id);
    setBusyId("");
    if (error) {
      toast.error("Gagal menyimpan jabatan", { description: error.message });
      return;
    }
    toast.success(`Jabatan ${a.full_name || "admin"} tersimpan`);
  };

  const ubah = (id: string, patch: Partial<Anggota>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 pb-16">
      <h1 className="font-display flex items-center gap-2 text-3xl font-black tracking-tight">
        <Users className="h-7 w-7 text-primary" /> Jabatan tim
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Keterangan jabatan tampil di papan peringkat kurir agar konsumen tahu peran tiap admin.
      </p>

      {rows.length === 0 ? (
        <p className="surface-card mt-4 p-8 text-center text-sm text-muted-foreground">
          Belum ada admin lain. Tambahkan admin dulu di halaman Pengaturan.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {rows.map((a) => (
            <section key={a.id} className="surface-card space-y-3 p-4">
              <div className="flex items-center gap-2">
                <p className="text-base font-bold">{a.full_name || "Tanpa nama"}</p>
                {a.is_owner && <Badge variant="secondary">Admin utama</Badge>}
                <span className="ml-auto text-xs text-muted-foreground">{a.whatsapp || "-"}</span>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`j-${a.id}`}>Jabatan</Label>
                <Input
                  id={`j-${a.id}`}
                  value={a.job_title}
                  onChange={(e) => ubah(a.id, { job_title: e.target.value })}
                  maxLength={60}
                  placeholder="Contoh: Kurir"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {SARAN.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => ubah(a.id, { job_title: s })}
                      className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-accent"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`b-${a.id}`}>Keterangan singkat</Label>
                <Textarea
                  id={`b-${a.id}`}
                  rows={2}
                  maxLength={200}
                  value={a.bio}
                  onChange={(e) => ubah(a.id, { bio: e.target.value })}
                  placeholder="Contoh: Siap antar area Nanga Mahap kota setiap hari."
                />
              </div>
              <Button size="sm" onClick={() => void simpan(a)} disabled={busyId === a.id}>
                {busyId === a.id ? "Menyimpan..." : "Simpan"}
              </Button>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
