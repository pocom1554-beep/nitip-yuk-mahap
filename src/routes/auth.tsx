import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Masuk atau Daftar — NitipYuk" },
      { name: "description", content: "Masuk ke akun NitipYuk untuk mulai menitip belanjaan." },
      { property: "og:title", content: "Masuk atau Daftar — NitipYuk" },
      { property: "og:description", content: "Akun pelanggan dan admin jasa titip Nanga Mahap." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [name, setName] = useState("");
  const [wa, setWa] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!loading && user) void navigate({ to: "/" });
  }, [user, loading, navigate]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword,
    });
    setBusy(false);
    if (error) return toast.error("Gagal masuk", { description: error.message });
    toast.success("Berhasil masuk");
    void navigate({ to: "/" });
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !wa.trim()) return toast.error("Nama dan nomor WhatsApp wajib diisi");
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: name.trim(), whatsapp: wa.trim(), address: address.trim() },
      },
    });
    setBusy(false);
    if (error) return toast.error("Gagal daftar", { description: error.message });
    if (data.session) {
      toast.success("Akun dibuat!");
      void navigate({ to: "/" });
    } else {
      toast.success("Akun dibuat", {
        description: "Cek email kamu untuk konfirmasi sebelum masuk.",
      });
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <Link to="/" className="mb-6 flex flex-col items-center gap-2 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-hero text-primary-foreground">
          <ShoppingBag className="h-5 w-5" />
        </span>
        <h1 className="text-2xl font-extrabold tracking-tight">NitipYuk</h1>
        <p className="text-sm text-muted-foreground">Mau apa aja, tinggal titip!</p>
      </Link>

      <div className="surface-card p-5">
        <Tabs defaultValue="masuk">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="masuk">Masuk</TabsTrigger>
            <TabsTrigger value="daftar">Daftar</TabsTrigger>
          </TabsList>

          <TabsContent value="masuk">
            <form onSubmit={signIn} className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="le">Email</Label>
                <Input id="le" type="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lp">Kata sandi</Label>
                <Input id="lp" type="password" required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Memproses..." : "Masuk"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="daftar">
            <form onSubmit={signUp} className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="n">Nama lengkap</Label>
                <Input id="n" required value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="w">Nomor WhatsApp</Label>
                <Input id="w" required placeholder="08xxxxxxxxxx" value={wa} onChange={(e) => setWa(e.target.value)} maxLength={20} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="a">Alamat (desa/dusun)</Label>
                <Input id="a" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={160} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e">Email</Label>
                <Input id="e" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p">Kata sandi</Label>
                <Input id="p" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Memproses..." : "Buat akun"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Pendaftar pertama otomatis menjadi Admin utama (admin01).
              </p>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
