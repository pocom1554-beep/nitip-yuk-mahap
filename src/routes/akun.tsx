import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, ClipboardList, LogOut, MapPin, ShieldCheck, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { resolveBucketUrl, uploadAvatar } from "@/lib/images";
import { rupiah, STATUS_LABEL } from "@/lib/format";
import { mapsEmbed, mapsLink } from "@/lib/maps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Route = createFileRoute("/akun")({
  head: () => ({
    meta: [
      { title: "Dashboard Akun — NitipYuk" },
      {
        name: "description",
        content: "Kelola foto profil, data kontak, alamat peta, dan pantau ringkasan pesanan NitipYuk kamu.",
      },
      { property: "og:title", content: "Dashboard Akun — NitipYuk" },
      { property: "og:description", content: "Kelola profil dan pantau ringkasan pesanan jasa titip kamu." },
    ],
  }),
  component: AkunPage,
});

type OrderLite = {
  id: string;
  total: number;
  status: string;
  created_at: string;
};

function AkunPage() {
  const { user, profile, isAdmin, isOwner, loading, refresh, signOut } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [wa, setWa] = useState("");
  const [address, setAddress] = useState("");
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderLite[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setWa(profile.whatsapp ?? "");
    setAddress(profile.address ?? "");
    void resolveBucketUrl("avatars", profile.avatar_url).then(setAvatarSrc);
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    void supabase
      .from("orders")
      .select("id, total, status, created_at")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setOrders((data ?? []) as OrderLite[]));
  }, [user]);

  if (loading) {
    return <main className="p-10 text-center text-sm text-muted-foreground">Memuat...</main>;
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-bold">Masuk dulu yuk</h1>
        <p className="mt-2 text-sm text-muted-foreground">Dashboard akun hanya bisa dibuka setelah kamu masuk.</p>
        <Button asChild className="mt-4">
          <Link to="/auth">Masuk</Link>
        </Button>
      </main>
    );
  }

  const simpan = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim(), whatsapp: wa.trim(), address: address.trim() })
      .eq("id", user.id);
    setBusy(false);
    if (error) {
      toast.error("Gagal menyimpan profil", { description: error.message });
      return;
    }
    await refresh();
    toast.success("Profil tersimpan");
  };

  const gantiFoto = async (file: File) => {
    setUploading(true);
    try {
      const path = await uploadAvatar(user.id, file);
      const { error } = await supabase.from("profiles").update({ avatar_url: path }).eq("id", user.id);
      if (error) throw error;
      setAvatarSrc(await resolveBucketUrl("avatars", path));
      await refresh();
      toast.success("Foto profil diperbarui");
    } catch (e) {
      toast.error("Gagal mengunggah foto", { description: (e as Error).message });
    } finally {
      setUploading(false);
    }
  };

  const totalBelanja = orders
    .filter((o) => o.status === "selesai")
    .reduce((a, o) => a + Number(o.total || 0), 0);
  const aktif = orders.filter((o) => !["selesai", "batal"].includes(o.status)).length;

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 pb-16">
      <h1 className="text-2xl font-extrabold tracking-tight">Dashboard akun</h1>

      <section className="surface-card mt-4 flex flex-wrap items-center gap-4 p-4">
        <div className="relative">
          <Avatar className="h-20 w-20">
            {avatarSrc && <AvatarImage src={avatarSrc} alt={`Foto profil ${fullName || "pengguna"}`} />}
            <AvatarFallback className="text-lg font-bold">
              {(fullName || "N").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow"
            aria-label="Ganti foto profil"
          >
            <Camera className="h-4 w-4" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void gantiFoto(f);
              e.target.value = "";
            }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold">{fullName || "Tanpa nama"}</p>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {isOwner && <Badge variant="secondary">Admin utama</Badge>}
            {isAdmin && !isOwner && <Badge>Admin</Badge>}
            {!isAdmin && <Badge variant="outline">Pelanggan</Badge>}
            {uploading && <span className="text-xs text-muted-foreground">Mengunggah foto...</span>}
          </div>
        </div>
      </section>

      <section className="mt-4 grid grid-cols-3 gap-3">
        <div className="surface-card p-3 text-center">
          <p className="text-xl font-extrabold">{orders.length}</p>
          <p className="text-[11px] text-muted-foreground">Total pesanan</p>
        </div>
        <div className="surface-card p-3 text-center">
          <p className="text-xl font-extrabold">{aktif}</p>
          <p className="text-[11px] text-muted-foreground">Sedang berjalan</p>
        </div>
        <div className="surface-card p-3 text-center">
          <p className="text-base font-extrabold text-primary">{rupiah(totalBelanja)}</p>
          <p className="text-[11px] text-muted-foreground">Belanja selesai</p>
        </div>
      </section>

      <section className="surface-card mt-4 space-y-3 p-4">
        <h2 className="font-semibold">Data profil</h2>
        <div className="space-y-1.5">
          <Label htmlFor="nm">Nama lengkap</Label>
          <Input id="nm" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={80} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wa">Nomor WhatsApp</Label>
          <Input id="wa" value={wa} onChange={(e) => setWa(e.target.value)} maxLength={20} placeholder="08xxxxxxxxxx" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="al">Alamat pengantaran</Label>
          <Textarea id="al" rows={2} maxLength={300} value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void simpan()} disabled={busy}>
            {busy ? "Menyimpan..." : "Simpan perubahan"}
          </Button>
          {address.trim() && (
            <Button asChild variant="outline">
              <a href={mapsLink({ address })} target="_blank" rel="noreferrer">
                <MapPin className="h-4 w-4" /> Lihat di Google Maps
              </a>
            </Button>
          )}
        </div>
        {address.trim() && (
          <iframe
            title="Peta alamat saya"
            src={mapsEmbed({ address })}
            className="mt-2 h-56 w-full rounded-xl border border-border"
            loading="lazy"
          />
        )}
      </section>

      <section className="surface-card mt-4 p-4">
        <h2 className="font-semibold">Pesanan terakhir</h2>
        {orders.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Belum ada pesanan.</p>
        ) : (
          <div className="mt-2 divide-y divide-border">
            {orders.slice(0, 5).map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold">#{o.id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("id-ID")}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{rupiah(o.total)}</p>
                  <p className="text-xs text-muted-foreground">{STATUS_LABEL[o.status] ?? o.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/pesanan">
              <ClipboardList className="h-4 w-4" /> Semua pesanan
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/">
              <ShoppingBag className="h-4 w-4" /> Katalog
            </Link>
          </Button>
          {isAdmin && (
            <Button asChild variant="outline" size="sm">
              <Link to="/admin">
                <ShieldCheck className="h-4 w-4" /> Dasbor admin
              </Link>
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => void signOut()}>
            <LogOut className="h-4 w-4" /> Keluar
          </Button>
        </div>
      </section>
    </main>
  );
}
