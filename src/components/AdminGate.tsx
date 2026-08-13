import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export function AdminGate({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return <main className="p-10 text-center text-sm text-muted-foreground">Memuat...</main>;
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-bold">Khusus admin</h1>
        <p className="mt-2 text-sm text-muted-foreground">Masuk dengan akun admin untuk membuka halaman ini.</p>
        <Button asChild className="mt-4">
          <Link to="/auth">Masuk</Link>
        </Button>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-bold">Akses ditolak</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Akun kamu bukan admin. Hubungi admin utama bila butuh akses.
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/">Kembali ke katalog</Link>
        </Button>
      </main>
    );
  }

  return <>{children}</>;
}
