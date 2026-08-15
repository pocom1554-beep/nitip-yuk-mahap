import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MessageSquareHeart, Send, PackagePlus, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/masukan")({
  head: () => ({
    meta: [
      { title: "Kritik, Saran & Request Barang — NitipYuk" },
      {
        name: "description",
        content:
          "Kirim kritik, saran, atau request barang baru untuk NitipYuk Nanga Mahap. Dibaca langsung oleh admin utama.",
      },
      { property: "og:title", content: "Kritik, Saran & Request Barang — NitipYuk" },
      { property: "og:description", content: "Suaramu bantu NitipYuk jadi lebih baik." },
    ],
  }),
  component: Masukan,
});

type Feedback = {
  id: string;
  user_name: string;
  type: string;
  item_name: string;
  message: string;
  status: string;
  reply: string;
  created_at: string;
};

const TYPE_LABEL: Record<string, string> = {
  kritik: "Kritik",
  saran: "Saran",
  request: "Request barang",
};

const STATUS_LABEL: Record<string, string> = {
  baru: "Menunggu ditinjau",
  ditinjau: "Sedang ditinjau",
  selesai: "Selesai",
  ditolak: "Belum bisa dipenuhi",
};

function Masukan() {
  const { user, profile, isOwner, loading } = useAuth();
  const [rows, setRows] = useState<Feedback[]>([]);
  const [type, setType] = useState("saran");
  const [itemName, setItemName] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false });
    setRows((data ?? []) as unknown as Feedback[]);
  };

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user]);

  const kirim = async () => {
    if (!user) return;
    if (!message.trim()) {
      toast.error("Tulis pesanmu dulu ya");
      return;
    }
    setSending(true);
    const { error } = await supabase.from("feedback").insert({
      user_id: user.id,
      user_name: profile?.full_name || "Konsumen",
      type,
      item_name: itemName.trim(),
      message: message.trim(),
    });
    setSending(false);
    if (error) {
      toast.error("Gagal mengirim", { description: error.message });
      return;
    }
    setMessage("");
    setItemName("");
    toast.success("Terkirim! Admin utama akan membacanya.");
    void load();
  };

  const balas = async (id: string, reply: string, status: string) => {
    const { error } = await supabase.from("feedback").update({ reply, status }).eq("id", id);
    if (error) {
      toast.error("Gagal menyimpan", { description: error.message });
      return;
    }
    toast.success("Tanggapan tersimpan");
    void load();
  };

  if (loading) {
    return <main className="p-10 text-center text-sm text-muted-foreground">Memuat...</main>;
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold">Masuk dulu ya</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Fitur kritik, saran & request barang khusus untuk konsumen terdaftar.
        </p>
        <Button asChild className="mt-4">
          <Link to="/auth">Masuk / Daftar</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 pb-20">
      <section className="overflow-hidden rounded-3xl bg-sunset px-6 py-9 text-primary-foreground shadow-[var(--shadow-pop)]">
        <MessageSquareHeart className="h-8 w-8" />
        <h1 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">
          Kritik, saran & request barang
        </h1>
        <p className="mt-2 max-w-md text-sm text-primary-foreground/90">
          Ada barang yang belum ada di katalog? Atau pelayanan kami kurang pas? Tulis di sini —
          hanya kamu dan admin utama yang bisa melihatnya.
        </p>
      </section>

      <div className="surface-pop mt-6 space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Jenis masukan</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="saran">Saran</SelectItem>
                <SelectItem value="kritik">Kritik</SelectItem>
                <SelectItem value="request">Request barang</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {type === "request" && (
            <div className="space-y-2">
              <Label>Nama barang yang diminta</Label>
              <Input
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="Contoh: Gas LPG 3kg"
              />
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label>Pesan</Label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="Tulis kritik, saran, atau detail barang yang kamu inginkan..."
          />
        </div>
        <Button onClick={() => void kirim()} disabled={sending} className="w-full" size="lg">
          <Send className="h-4 w-4" /> {sending ? "Mengirim..." : "Kirim masukan"}
        </Button>
      </div>

      <h2 className="section-title mt-9">
        {isOwner ? "Semua masukan konsumen" : "Riwayat masukanmu"}
      </h2>
      {isOwner && (
        <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-primary">
          <ShieldCheck className="h-4 w-4" /> Kamu admin utama — bisa membalas semua masukan.
        </p>
      )}

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Belum ada masukan.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {rows.map((f) => (
            <FeedbackCard key={f.id} f={f} isOwner={isOwner} onReply={balas} />
          ))}
        </div>
      )}
    </main>
  );
}

function FeedbackCard({
  f,
  isOwner,
  onReply,
}: {
  f: Feedback;
  isOwner: boolean;
  onReply: (id: string, reply: string, status: string) => Promise<void>;
}) {
  const [reply, setReply] = useState(f.reply);
  const [status, setStatus] = useState(f.status);

  return (
    <article className="surface-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={f.type === "request" ? "bg-mint" : ""}>
          {f.type === "request" && <PackagePlus className="mr-1 h-3 w-3" />}
          {TYPE_LABEL[f.type] ?? f.type}
        </Badge>
        <Badge variant="secondary">{STATUS_LABEL[f.status] ?? f.status}</Badge>
        <span className="ml-auto text-xs text-muted-foreground">
          {new Date(f.created_at).toLocaleDateString("id-ID")}
        </span>
      </div>
      {isOwner && <p className="mt-2 text-xs font-semibold">Dari: {f.user_name || "Konsumen"}</p>}
      {f.item_name && <p className="mt-2 text-base font-bold">{f.item_name}</p>}
      <p className="mt-1 text-sm leading-relaxed">{f.message}</p>

      {f.reply && !isOwner && (
        <div className="mt-3 rounded-xl bg-accent p-3 text-sm text-accent-foreground">
          <span className="font-semibold">Balasan admin: </span>
          {f.reply}
        </div>
      )}

      {isOwner && (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          <Textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={2}
            placeholder="Tulis balasan untuk konsumen..."
          />
          <div className="flex gap-2">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="baru">Menunggu ditinjau</SelectItem>
                <SelectItem value="ditinjau">Sedang ditinjau</SelectItem>
                <SelectItem value="selesai">Selesai</SelectItem>
                <SelectItem value="ditolak">Belum bisa dipenuhi</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => void onReply(f.id, reply, status)}>
              Simpan
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}
