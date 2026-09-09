import { notifyAdminsNewOrder } from "@/lib/push.functions";
import { notifyKurirGroupNewOrder } from "@/lib/whatsapp.functions";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Minus, Plus, Trash2, MessageCircle, MapPin, LocateFixed, PackagePlus, Clock, Search, Store, Check } from "lucide-react";
import { mapsEmbed, mapsLink, mapsRouteEmbed, mapsRouteFromStore } from "@/lib/maps";
import { hitungRutePengiriman } from "@/lib/route.functions";
import { resolveImageUrls } from "@/lib/images";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { hitungOngkir, rupiah, waLink } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

type Promo = { code: string; kind: string; value: number; min_spend: number; max_discount: number };

type KatalogItem = {
  id: string;
  name: string;
  store_name: string;
  price: number;
  image_url: string | null;
  is_available: boolean;
  price_options: unknown;
  detail: string | null;
};

type OpsiHarga = { label: string; price: number };

type TokoAsal = { name: string; lat: number | null; lng: number | null; address: string };

function parseOpsiHarga(raw: unknown): OpsiHarga[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => item as { label?: unknown; price?: unknown })
    .filter((item) => typeof item.label === "string" && item.label.trim() !== "")
    .map((item) => ({ label: String(item.label), price: Number(item.price) || 0 }));
}

function Checkout() {
  const { items, setQty, remove, total, clear, add } = useCart();
  const { bukaSekarang, open_time, close_time } = useSiteSettings();
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
  const [kode, setKode] = useState("");
  const [promo, setPromo] = useState<Promo | null>(null);
  const [katalog, setKatalog] = useState<KatalogItem[]>([]);
  const [cariItem, setCariItem] = useState("");
  const [katalogImg, setKatalogImg] = useState<Record<string, string>>({});
  const [produkDipilih, setProdukDipilih] = useState<KatalogItem | null>(null);
  const [opsiDipilih, setOpsiDipilih] = useState("");
  const [jumlahTambahan, setJumlahTambahan] = useState(1);
  const [stores, setStores] = useState<TokoAsal[]>([]);
  const [durasiMenit, setDurasiMenit] = useState(0);
  const [sumberJarak, setSumberJarak] = useState<"manual" | "google" | "perkiraan">("manual");
  const [menghitungRute, setMenghitungRute] = useState(false);


  const katalogTampil = katalog
    .filter(
      (p) =>
        p.is_available &&
        (p.name.toLowerCase().includes(cariItem.toLowerCase()) ||
          (p.store_name ?? "").toLowerCase().includes(cariItem.toLowerCase())),
    )
    .slice(0, 8);

  const tambahDariKatalog = (p: KatalogItem, opsi?: OpsiHarga) => {
    add({
      id: opsi ? `${p.id}::${opsi.label}` : p.id,
      productId: p.id,
      name: opsi ? `${p.name} (${opsi.label})` : p.name,
      price: opsi?.price ?? (Number(p.price) || 0),
      image: p.image_url,
      storeName: p.store_name,
      variantLabel: opsi?.label ?? "",
    });
    toast.success(`${p.name} ditambahkan ke keranjang`);
  };

  const bukaDetailProduk = (p: KatalogItem) => {
    const opsi = parseOpsiHarga(p.price_options);
    setProdukDipilih(p);
    setOpsiDipilih(opsi[0]?.label ?? "");
    setJumlahTambahan(1);
  };

  const tambahkanProdukDipilih = () => {
    if (!produkDipilih) return;
    const pilihan = parseOpsiHarga(produkDipilih.price_options).find((opsi) => opsi.label === opsiDipilih);
    tambahDariKatalog(produkDipilih, pilihan);
    if (jumlahTambahan > 1) {
      const id = pilihan ? `${produkDipilih.id}::${pilihan.label}` : produkDipilih.id;
      setQty(id, jumlahTambahan);
    }
    setProdukDipilih(null);
  };


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
    const loadKatalog = async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, store_name, price, image_url, is_available, price_options, detail")
        .order("name");
      const list = (data ?? []) as unknown as KatalogItem[];
      setKatalog(list);
      setKatalogImg(await resolveImageUrls(list.map((p) => p.image_url)));
    };
    void loadKatalog();
  }, []);

  useEffect(() => {
    void supabase
      .from("stores")
      .select("name, lat, lng, address")
      .then(({ data }) => setStores((data ?? []) as unknown as TokoAsal[]));
  }, []);

  useEffect(() => {
    if (profile) {
      setAddress((a) => a || profile.address);
      setWa((w) => w || profile.whatsapp);
    }
  }, [profile]);

  const namaTokoPertama = items[0]?.storeName?.trim() ?? "";
  const tokoAsal =
    stores.find((s) => s.name.trim().toLowerCase() === namaTokoPertama.toLowerCase()) ?? null;
  const asalPunyaKoordinat = typeof tokoAsal?.lat === "number" && typeof tokoAsal?.lng === "number";

  useEffect(() => {
    if (!coords || !tokoAsal || !asalPunyaKoordinat) return;
    let batal = false;
    setMenghitungRute(true);
    void hitungRutePengiriman({
      data: {
        originLat: tokoAsal.lat as number,
        originLng: tokoAsal.lng as number,
        destLat: coords.lat,
        destLng: coords.lng,
      },
    })
      .then((res) => {
        if (batal) return;
        setDistance(String(res.distanceKm));
        setDurasiMenit(res.durationMin);
        setSumberJarak(res.source);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!batal) setMenghitungRute(false);
      });
    return () => {
      batal = true;
    };
  }, [coords?.lat, coords?.lng, tokoAsal?.name, tokoAsal?.lat, tokoAsal?.lng, asalPunyaKoordinat]);

  const ongkir = hitungOngkir(Number(distance), settings);
  const diskon = promo
    ? Math.min(
        promo.kind === "persen"
          ? Math.round((total * Number(promo.value)) / 100)
          : Number(promo.value),
        promo.max_discount > 0 ? Number(promo.max_discount) : Number.MAX_SAFE_INTEGER,
        total,
      )
    : 0;
  const grandTotal = Math.max(0, total + ongkir - diskon);

  const pakaiVoucher = async () => {
    const code = kode.trim().toUpperCase();
    if (!code) return;
    const { data } = await supabase
      .from("promos")
      .select("code, kind, value, min_spend, max_discount, is_active, expires_at")
      .eq("code", code)
      .maybeSingle();
    if (!data || !data.is_active) {
      setPromo(null);
      toast.error("Kode voucher tidak ditemukan atau sudah nonaktif");
      return;
    }
    if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
      setPromo(null);
      toast.error("Voucher sudah kedaluwarsa");
      return;
    }
    if (total < Number(data.min_spend)) {
      setPromo(null);
      toast.error(`Minimal belanja ${rupiah(Number(data.min_spend))} untuk voucher ini`);
      return;
    }
    setPromo(data as unknown as Promo);
    toast.success(`Voucher ${code} dipakai`);
  };

  const kirim = async () => {
    if (!user) {
      void navigate({ to: "/auth" });
      return;
    }
    if (items.length === 0 && !note.trim()) {
      toast.error("Keranjang kosong", { description: "Pilih barang atau tulis titipanmu di catatan." });
      return;
    }
    if (!bukaSekarang) {
      toast.error("Layanan sedang tutup", {
        description: `Jam operasional NitipYuk ${open_time} - ${close_time} WIB.`,
      });
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
        items: items.map((i) => ({
          product_id: i.productId ?? i.id.split("::")[0],
          name: i.name,
          price: i.price,
          qty: i.qty,
          image_url: i.image ?? null,
          store_name: i.storeName ?? "",
          variant_label: i.variantLabel ?? "",
        })),
        distance_km: Number(distance) || 0,
        items_total: total,
        delivery_fee: ongkir,
        promo_code: promo?.code ?? "",
        discount: diskon,
        total: grandTotal,
        status: "baru",
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        map_link: mapLink.trim(),
        origin_store: tokoAsal?.name ?? namaTokoPertama,
        origin_lat: tokoAsal?.lat ?? null,
        origin_lng: tokoAsal?.lng ?? null,
        route_duration_min: durasiMenit,
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
      void notifyKurirGroupNewOrder({ data: { orderId: data.id as string } }).catch(() => undefined);
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
      <h1 className="font-display text-3xl font-black tracking-tight">Keranjang titipan</h1>

      {!bukaSekarang && (
        <div className="mt-3 flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <Clock className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Layanan sedang <strong>tutup</strong>. Jam operasional {open_time} - {close_time} WIB. Kamu tetap bisa menyiapkan
            keranjang, pesanan dikirim saat layanan buka.
          </span>
        </div>
      )}

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
              {i.image && katalogImg[i.image] && (
                <img src={katalogImg[i.image]} alt={i.name} className="h-11 w-11 shrink-0 rounded-lg object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{i.name}</p>
                {i.storeName && <p className="truncate text-[11px] font-medium text-primary">{i.storeName}</p>}
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
        <h2 className="flex items-center gap-2 font-semibold">
          <PackagePlus className="h-4 w-4 text-primary" /> Tambah pesanan lain
        </h2>
        <p className="text-xs text-muted-foreground">
          Pilih langsung barang lain dari katalog tanpa harus keluar dari keranjang.
        </p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={cariItem}
            onChange={(e) => setCariItem(e.target.value)}
            placeholder="Cari barang atau toko di katalog..."
            className="pl-9"
          />
        </div>
        {katalogTampil.length === 0 ? (
          <p className="text-xs text-muted-foreground">Barang tidak ditemukan di katalog.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {katalogTampil.map((p) => {
              const opsiHarga = parseOpsiHarga(p.price_options);
              const hargaTerendah = opsiHarga.length > 0 ? Math.min(...opsiHarga.map((opsi) => opsi.price)) : Number(p.price);
              return (
              <li key={p.id} className="flex items-center gap-3 p-2.5">
                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-muted">
                  {p.image_url && katalogImg[p.image_url] ? (
                    <img src={katalogImg[p.image_url]} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <PackagePlus className="h-4 w-4" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{p.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {opsiHarga.length > 0 ? `Mulai ${rupiah(hargaTerendah)}` : rupiah(Number(p.price))}
                    {p.store_name ? ` · ${p.store_name}` : ""}
                  </p>
                  {opsiHarga.length > 0 && (
                    <p className="mt-0.5 text-[10px] font-semibold text-primary">{opsiHarga.length} pilihan variasi</p>
                  )}
                </div>
                <Button type="button" size="sm" variant="outline" className="h-8 shrink-0 px-2.5" onClick={() => bukaDetailProduk(p)}>
                  <Plus className="h-3.5 w-3.5" /> {opsiHarga.length > 0 ? "Pilih" : "Detail"}
                </Button>
              </li>
              );
            })}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">
          Barang tidak ada di katalog? Tulis saja di kolom catatan — admin akan konfirmasi lewat WhatsApp.
        </p>
      </section>

      <Dialog open={Boolean(produkDipilih)} onOpenChange={(open) => !open && setProdukDipilih(null)}>
        <DialogContent className="max-h-[90vh] w-[calc(100%-1.5rem)] overflow-y-auto rounded-2xl p-4 sm:max-w-md sm:p-5">
          {produkDipilih && (() => {
            const opsiHarga = parseOpsiHarga(produkDipilih.price_options);
            const pilihan = opsiHarga.find((opsi) => opsi.label === opsiDipilih);
            const hargaSatuan = pilihan?.price ?? Number(produkDipilih.price);
            return (
              <>
                <div className="flex gap-3 pr-7">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                    {produkDipilih.image_url && katalogImg[produkDipilih.image_url] ? (
                      <img
                        src={katalogImg[produkDipilih.image_url]}
                        alt={produkDipilih.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        <PackagePlus className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <DialogHeader className="min-w-0 flex-1 text-left">
                    <DialogTitle className="text-base leading-snug">{produkDipilih.name}</DialogTitle>
                    <DialogDescription className="flex items-center gap-1 text-xs">
                      <Store className="h-3.5 w-3.5" /> {produkDipilih.store_name || "Mitra NitipYuk"}
                    </DialogDescription>
                    <p className="text-base font-black text-primary">{rupiah(hargaSatuan)}</p>
                  </DialogHeader>
                </div>

                {produkDipilih.detail && (
                  <p className="rounded-lg bg-muted/60 p-2.5 text-xs leading-relaxed text-muted-foreground">
                    {produkDipilih.detail}
                  </p>
                )}

                {opsiHarga.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Pilih variasi harga</Label>
                      <span className="text-[10px] text-muted-foreground">Wajib dipilih</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {opsiHarga.map((opsi) => {
                        const aktif = opsi.label === opsiDipilih;
                        return (
                          <Button
                            key={opsi.label}
                            type="button"
                            variant={aktif ? "default" : "outline"}
                            className="h-auto min-h-12 justify-between whitespace-normal px-3 py-2 text-left"
                            onClick={() => setOpsiDipilih(opsi.label)}
                          >
                            <span className="min-w-0">
                              <span className="block text-xs font-bold">{opsi.label}</span>
                              <span className="block text-[11px] opacity-80">{rupiah(opsi.price)}</span>
                            </span>
                            {aktif && <Check className="h-4 w-4 shrink-0" />}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between rounded-xl border border-border p-2.5">
                  <div>
                    <p className="text-xs font-semibold">Jumlah pesanan</p>
                    <p className="text-[10px] text-muted-foreground">Atur jumlah barang ini</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => setJumlahTambahan((jumlah) => Math.max(1, jumlah - 1))}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="w-7 text-center text-sm font-bold">{jumlahTambahan}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => setJumlahTambahan((jumlah) => Math.min(99, jumlah + 1))}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <Button type="button" className="w-full" onClick={tambahkanProdukDipilih}>
                  <PackagePlus className="h-4 w-4" /> Tambahkan · {rupiah(hargaSatuan * jumlahTambahan)}
                </Button>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>


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
              Koordinat: {coords.lat}, {coords.lng}
            </p>
          )}
          {(coords || address.trim()) &&
            (asalPunyaKoordinat && coords ? (
              <iframe
                title="Rute dari toko ke alamat pengantaran"
                src={mapsRouteEmbed({ lat: tokoAsal?.lat, lng: tokoAsal?.lng, address: tokoAsal?.address }, coords)}
                className="h-52 w-full rounded-xl border border-border"
                loading="lazy"
              />
            ) : (
              <iframe
                title="Peta lokasi pengantaran"
                src={mapsEmbed({ ...coords, address })}
                className="h-52 w-full rounded-xl border border-border"
                loading="lazy"
              />
            ))}
        </div>
        {namaTokoPertama && (
          <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-3">
            <p className="text-sm font-semibold">Titik jemput: {tokoAsal?.name ?? namaTokoPertama}</p>
            <p className="text-xs text-muted-foreground">
              {asalPunyaKoordinat
                ? menghitungRute
                  ? "Mencari rute tercepat ke alamatmu..."
                  : coords
                    ? `Rute ${sumberJarak === "google" ? "tercepat Google Maps" : "perkiraan"}: ${distance} km${
                        durasiMenit > 0 ? ` · sekitar ${durasiMenit} menit` : ""
                      }`
                    : "Bagikan lokasimu agar jarak dihitung otomatis dari toko ini."
                : "Titik lokasi toko ini belum diisi admin, jarak Google Maps belum bisa dihitung."}
            </p>
            {asalPunyaKoordinat && (coords || address.trim()) && (
              <Button asChild type="button" variant="outline" size="sm">
                <a
                  href={mapsRouteFromStore(
                    { lat: tokoAsal?.lat, lng: tokoAsal?.lng, address: tokoAsal?.address },
                    { ...coords, address },
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MapPin className="h-4 w-4" /> Lihat rute pengantaran
                </a>
              </Button>
            )}
          </div>
        )}
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
        <div className="space-y-1.5">
          <Label htmlFor="vc">Kode voucher</Label>
          <div className="flex gap-2">
            <Input
              id="vc"
              value={kode}
              onChange={(e) => setKode(e.target.value.toUpperCase())}
              placeholder="NITIPHEMAT"
              maxLength={24}
            />
            <Button type="button" variant="outline" onClick={() => void pakaiVoucher()}>
              Pakai
            </Button>
          </div>
          {promo && (
            <p className="text-xs font-semibold text-primary">
              Voucher {promo.code} aktif — potongan {rupiah(diskon)}
            </p>
          )}
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal barang</span>
          <span className="font-semibold">{rupiah(total)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Ongkos titip ({distance || 0} km)</span>
          <span className="font-semibold">{rupiah(ongkir)}</span>
        </div>
        {diskon > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Potongan voucher</span>
            <span className="font-semibold text-primary">-{rupiah(diskon)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-border pt-2 text-base">
          <span className="font-semibold">Total perkiraan</span>
          <span className="font-extrabold text-primary">{rupiah(grandTotal)}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Harga titipan bebas akan dikonfirmasi admin lewat WhatsApp.
        </p>
      </section>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button className="flex-1" size="lg" onClick={() => void kirim()} disabled={busy || loading || !bukaSekarang}>
          {!user
            ? "Masuk untuk memesan"
            : !bukaSekarang
              ? `Tutup — buka ${open_time}`
              : busy
                ? "Mengirim..."
                : "Kirim pesanan ke admin"}
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
