import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { rupiah, waLink, STATUS_LABEL } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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


export const Route = createFileRoute("/pesanan")({
  head: () => ({
    meta: [
      { title: "Pesanan Saya — NitipYuk" },
      { name: "description", content: "Pantau status titipanmu dan hubungi admin NitipYuk lewat WhatsApp." },
      { property: "og:title", content: "Pesanan Saya — NitipYuk" },
      { property: "og:description", content: "Pantau status titipan jasa titip Nanga Mahap." },
    ],
  }),
  component: PesananSaya,
});

type OrderItem = { name: string; price: number; qty: number };
type Order = {
  id: string;
  items: OrderItem[];
  note: string;
  distance_km: number;
  items_total: number;
  delivery_fee: number;
  total: number;
  status: string;
  created_at: string;
  claimed_by: string | null;
};

function PesananSaya() {
  const { user, loading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [adminWa, setAdminWa] = useState("");
  const [cancelling, setCancelling] = useState<string | null>(null);

  const batalkan = async (id: string) => {
    setCancelling(id);
    const { error } = await supabase.from("orders").update({ status: "batal" }).eq("id", id);
    setCancelling(null);
    if (error) {
      toast.error("Gagal membatalkan pesanan");
      return;
    }
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: "batal" } : o)));
    toast.success("Pesanan dibatalkan");
  };


  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data }, { data: s }] = await Promise.all([
        supabase.from("orders").select("*").order("created_at", { ascending: false }),
        supabase.from("settings").select("admin_whatsapp").eq("id", 1).maybeSingle(),
      ]);
      setOrders((data ?? []) as unknown as Order[]);
      setAdminWa(s?.admin_whatsapp ?? "");
    };
    void load();

    const channel = supabase
      .channel("my-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => void load())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user]);

  if (loading) return <main className="p-10 text-center text-sm text-muted-foreground">Memuat...</main>;

  if (!user) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-bold">Masuk dulu ya</h1>
        <p className="mt-2 text-sm text-muted-foreground">Pesananmu tampil setelah kamu masuk ke akun.</p>
        <Button asChild className="mt-4">
          <Link to="/auth">Masuk / Daftar</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 pb-16">
      <h1 className="text-2xl font-extrabold tracking-tight">Pesanan saya</h1>

      {orders.length === 0 ? (
        <div className="surface-card mt-4 p-8 text-center">
          <p className="font-semibold">Belum ada pesanan</p>
          <Button asChild className="mt-4">
            <Link to="/">Mulai titip</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {orders.map((o) => (
            <article key={o.id} className="surface-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleString("id-ID")}
                  </p>
                  <p className="text-sm font-semibold">#{o.id.slice(0, 8)}</p>
                </div>
                <Badge variant={o.status === "selesai" ? "secondary" : "default"}>
                  {STATUS_LABEL[o.status] ?? o.status}
                </Badge>
              </div>

              <ul className="mt-3 space-y-1 text-sm">
                {o.items.map((i, idx) => (
                  <li key={idx} className="flex justify-between">
                    <span className="text-muted-foreground">
                      {i.name} x{i.qty}
                    </span>
                    <span>{rupiah(i.price * i.qty)}</span>
                  </li>
                ))}
              </ul>
              {o.note && <p className="mt-2 rounded-lg bg-muted p-2 text-xs">Catatan: {o.note}</p>}

              <div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-sm">
                <span className="text-muted-foreground">Ongkos titip {o.distance_km} km</span>
                <span>{rupiah(o.delivery_fee)}</span>
              </div>
              <div className="flex items-center justify-between text-base font-extrabold">
                <span>Total</span>
                <span className="text-primary">{rupiah(o.total)}</span>
              </div>

              {adminWa && (
                <Button asChild variant="outline" size="sm" className="mt-3 w-full">
                  <a
                    href={waLink(adminWa, `Halo admin, saya mau tanya pesanan #${o.id.slice(0, 8)}`)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle className="h-4 w-4" /> Hubungi admin
                  </a>
                </Button>
              )}

              {(o.status === "baru" || o.status === "diproses") && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 w-full text-destructive hover:text-destructive"
                      disabled={cancelling === o.id}
                    >
                      <X className="h-4 w-4" /> Batalkan pesanan
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Batalkan pesanan ini?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Pesanan #{o.id.slice(0, 8)} akan dibatalkan dan tidak diproses admin. Kalau
                        barang sudah dibelanjakan, hubungi admin dulu ya.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Tidak jadi</AlertDialogCancel>
                      <AlertDialogAction onClick={() => void batalkan(o.id)}>
                        Ya, batalkan
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

            </article>
          ))}
        </div>
      )}
    </main>
  );
}
