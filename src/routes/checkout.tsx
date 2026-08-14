import { notifyAdminsNewOrder } from "@/lib/push.functions";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Minus, Plus, Trash2, MessageCircle, MapPin, LocateFixed } from "lucide-react";
import { jarakDariPusat, mapsEmbed, mapsLink } from "@/lib/maps";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { hitungOngkir, rupiah, waLink } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Keranjang & Titipan — NitipYuk" },
      { name: "description", content: "Periksa titipanmu, hitung ongkos titip sesuai jarak, lalu kirim pesanan ke admin." },
      { property: "og:title", content: "Keranjang & Titipan — NitipYuk" },
      { property: "og:description", content: "Hitung ongkos titip sesuai jarak dan kirim pesanan." },
    ],
  }),
  component: Checkout,
});

type Settings = { base_fee: number; per_km_fee: number; free_km: number; admin_whatsapp: string };

function Checkout() {
  const { items, setQty, remove, total, clear } = useCart();
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  const [settings, setSettings] = useState<Settings>({
    base_fee: 5000,
    per_km_fee: 2000,
    free_km: 1,
    admin_whatsapp: "",
  });
  const [distance, setDistance] = useState("2");
  const [address, setAddress] = useState("");
  const [wa, setWa] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mapLink, setMapLink] = useState("");
  const [locating, setLocating] = useState(false);

  const ambilLokasi = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Perangkat tidak mendukung lokasi otomatis");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setCoords({ lat, lng });
        setMapLink(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
        setDistance(String(jarakDariPusat(lat, lng)));
        setLocating(false);
        toast.success("Lokasi peta tersimpan", { description: "Admin bisa langsung buka rute Google Maps." });
      },
      (err) => {
        setLocating(false);
        toast.error("Gagal mengambil lokasi", { description: err.message });
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  useEffect(() => {
    void supabase
      .from("settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setSettings(data as unknown as Settings);
      });
  }, []);

  useEffect(() => {
    if (profile) {
      setAddress((a) => a || profile.address);
      setWa((w) => w || profile.whatsapp);
    }
  }, [profile]);

  const ongkir = hitungOngkir(Number(distance), settings);
  const grandTotal = total + ongkir;

  const kirim = async () => {
    if (!user) {
      void navigate({ to: "/auth" });
      return;
    }
    if (items.length === 0 && !note.trim()) {
      toast.error("Keranjang kosong", { description: "Pilih barang atau tulis titipanmu di catatan." });
      return;
    }
    if (!wa.trim() || !address.trim()) {
      toast.error("Nomor WhatsApp dan alamat wajib diisi");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase
      .from("orders")
      .insert({
        customer_id: user.id,
        customer_name: profile?.full_name || "Pelanggan",
        customer_whatsapp: wa.trim(),
        address: address.trim(),
        note: note.trim(),
        items: items.map((i) => ({ name: i.name, price: i.price, qty: i.qty })),
        distance_km: Number(distance) || 0,
        items_total: total,
        delivery_fee: ongkir,
        total: grandTotal,
        status: "baru",
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        map_link: mapLink.trim(),
      })
      .select()
      .single();
    setBusy(false);
    if (error) {
      toast.error("Gagal mengirim pesanan", { description: error.message });
      return;
    }
    clear();
    toast.success("Pesanan terkirim ke admin!");
    if (data?.id) {
      void notifyAdminsNewOrder({
        data: {
          orderId: data.id as string,
          customerName: profile?.full_name || "Pelanggan",
          total: grandTotal,
        },
      }).catch(() => undefined);
    }
    void navigate({ to: "/pesanan" });
  };

  const ringkasanWa = [
    "Halo admin NitipYuk, saya mau titip:",
    ...items.map((i) => `- ${i.name} x${i.qty} (${rupiah(i.price * i.qty)})`),
    note.trim() ? `Catatan: ${note.trim()}` : "",
    `Jarak: ${distance} km — Ongkos titip ${rupiah(ongkir)}`,
    `Total perkiraan: ${rupiah(grandTotal)}`,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 pb-20">
      <h1 className="text-2xl font-extrabold tracking-tight">Keranjang titipan</h1>

      <section className="surface-card mt-4 divide-y divide-border">
        {items.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">
            Belum ada barang dari katalog.{" "}
            <Link to="/" className="font-semibold text-primary">
              Lihat katalog
            </Link>{" "}
            atau tulis titipan bebas di catatan bawah.
          </p>
        ) : (
          items.map((i) => (
            <div key={i.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{i.name}</p>
                <p className="text-xs text-muted-foreground">{rupiah(i.price)} / item</p>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setQty(i.id, i.qty - 1)}>
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <span className="w-7 text-center text-sm font-semibold">{i.qty}</span>
                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setQty(i.id, i.qty + 1)}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => remove(i.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="surface-card mt-4 space-y-3 p-4">
        <h2 className="font-semibold">Data pengantaran</h2>
        <div className="space-y-1.5">
          <Label htmlFor="wa">Nomor WhatsApp</Label>
          <Input id="wa" value={wa} onChange={(e) => setWa(e.target.value)} placeholder="08xxxxxxxxxx" maxLength={20} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="al">Alamat lengkap</Label>
          <Textarea id="al" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={300} rows={2} />
        </div>
        <div className="space-y-2">
          <Label>Titik lokasi (Google Maps)</Label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={ambilLokasi} disabled={locating}>
              <LocateFixed className="h-4 w-4" /> {locating ? "Mencari lokasi..." : "Bagikan lokasi saya"}
            </Button>
            {(coords || address.trim()) && (
              <Button asChild type="button" variant="ghost">
                <a href={mapsLink({ ...coords, address, map_link: mapLink })} target="_blank" rel="noreferrer">
                  <MapPin className="h-4 w-4" /> Buka peta
                </a>
              </Button>
            )}
          </div>
          <Input
            value={mapLink}
            onChange={(e) => setMapLink(e.target.value)}
            placeholder="atau tempel link Google Maps lokasimu"
          />
          {coords && (
            <p className="text-xs text-muted-foreground">
              Koordinat: {coords.lat}, {coords.lng} — perkiraan jarak {jarakDariPusat(coords.lat, coords.lng)} km.
            </p>
          )}
          {(coords || address.trim()) && (
            <iframe
              title="Peta lokasi pengantaran"
              src={mapsEmbed({ ...coords, address })}
              className="h-52 w-full rounded-xl border border-border"
              loading="lazy"
            />
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="jr">Jarak dari pusat Nanga Mahap (km)</Label>
          <Input
            id="jr"
            type="number"
            min={0}
            step="0.5"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Ongkos dasar {rupiah(settings.base_fee)} (sudah termasuk {settings.free_km} km) + {rupiah(settings.per_km_fee)}/km
            berikutnya.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ct">Catatan / titipan barang lain</Label>
          <Textarea
            id="ct"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={600}
            placeholder="Contoh: tolong belikan 2 kg gula pasir merk apa saja di toko depan pasar"
          />
        </div>
      </section>

      <section className="surface-card mt-4 space-y-2 p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal barang</span>
          <span className="font-semibold">{rupiah(total)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Ongkos titip ({distance || 0} km)</span>
          <span className="font-semibold">{rupiah(ongkir)}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-2 text-base">
          <span className="font-semibold">Total perkiraan</span>
          <span className="font-extrabold text-primary">{rupiah(grandTotal)}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Harga titipan bebas akan dikonfirmasi admin lewat WhatsApp.
        </p>
      </section>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button className="flex-1" size="lg" onClick={() => void kirim()} disabled={busy || loading}>
          {user ? (busy ? "Mengirim..." : "Kirim pesanan ke admin") : "Masuk untuk memesan"}
        </Button>
        {settings.admin_whatsapp && (
          <Button asChild variant="outline" size="lg">
            <a href={waLink(settings.admin_whatsapp, ringkasanWa)} target="_blank" rel="noreferrer">
              <MessageCircle className="h-4 w-4" /> Hubungi admin
            </a>
          </Button>
        )}
      </div>
    </main>
  );
}
