import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

/** Kartu untuk mengaktifkan notifikasi yang tetap muncul walau aplikasi ditutup. */
export function PushToggle({ role }: { role: "admin" | "customer" }) {
  const { user } = useAuth();
  const { state, busy, subscribe, unsubscribe } = usePushNotifications(!!user);

  if (!user) return null;

  const deskripsi =
    role === "admin"
      ? "Dapatkan pemberitahuan setiap ada pesanan baru, walau aplikasi sedang ditutup."
      : "Dapatkan pemberitahuan saat status pesananmu berubah, walau aplikasi sedang ditutup.";

  return (
    <section className="surface-card mt-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-muted">
            {state === "on" ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          </span>
          <div>
            <p className="font-semibold">Notifikasi perangkat</p>
            <p className="text-xs text-muted-foreground">{deskripsi}</p>
          </div>
        </div>

        {state === "unsupported" ? (
          <p className="text-xs text-muted-foreground">Browser ini belum mendukung notifikasi.</p>
        ) : state === "denied" ? (
          <p className="text-xs text-destructive">
            Izin notifikasi diblokir. Aktifkan lewat pengaturan browser.
          </p>
        ) : state === "on" ? (
          <Button variant="outline" size="sm" disabled={busy} onClick={() => void unsubscribe()}>
            Matikan
          </Button>
        ) : (
          <Button
            size="sm"
            disabled={busy}
            onClick={() =>
              void subscribe().then((ok) =>
                ok
                  ? toast.success("Notifikasi aktif")
                  : toast.error("Gagal mengaktifkan notifikasi"),
              )
            }
          >
            Aktifkan
          </Button>
        )}
      </div>
    </section>
  );
}
