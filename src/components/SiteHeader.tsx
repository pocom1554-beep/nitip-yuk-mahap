import { Link, useRouterState } from "@tanstack/react-router";
import {
  ShoppingBag,
  LogOut,
  ShieldCheck,
  ClipboardList,
  Menu,
  UserRound,
  Trophy,
  MessageSquareHeart,
  Store,
  BadgePercent,
  Users,
  Bike,
  Clock,
} from "lucide-react";
import wordmark from "@/assets/nitipyuk-wordmark.png.asset.json";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SiteHeader() {
  const { user, profile, isAdmin, isKurir, isOwner, signOut } = useAuth();
  const { count } = useCart();
  const { site_name, tagline, logoSrc, bukaSekarang, open_time, close_time } = useSiteSettings();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (pathname.startsWith("/auth")) return null;

  // Kurir murni (bukan admin) hanya boleh melihat menu terbatas.
  const kurirOnly = isKurir && !isAdmin;

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-5xl items-center gap-2.5 px-4">
        <Link to="/" className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-hero text-primary-foreground shadow-[var(--shadow-lift)]">
            {logoSrc ? (
              <img src={logoSrc} alt={`Logo ${site_name}`} className="h-full w-full object-cover" />
            ) : (
              <ShoppingBag className="h-7 w-7" />
            )}
          </span>
          <img
            src={wordmark.url}
            alt={`${site_name} — ${tagline}`}
            className="h-12 w-auto max-w-[168px] object-contain sm:h-14 sm:max-w-[210px] dark:brightness-0 dark:invert"
          />
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <span
            className={`hidden items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold md:inline-flex ${
              bukaSekarang ? "bg-success/12 text-success" : "bg-destructive/12 text-destructive"
            }`}
            title={`Jam operasional ${open_time} - ${close_time}`}
          >
            <Clock className="h-3.5 w-3.5" /> {bukaSekarang ? "Buka" : "Tutup"}
          </span>

          {!kurirOnly && (
            <Button asChild variant="ghost" size="sm" className="relative">
              <Link to="/checkout">
                <ShoppingBag className="h-4 w-4" />
                <span className="hidden sm:inline">Keranjang</span>
                {count > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {count}
                  </span>
                )}
              </Link>
            </Button>
          )}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Menu className="h-4 w-4" />
                  <span className="hidden max-w-24 truncate sm:inline">
                    {profile?.full_name || "Akun"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {kurirOnly ? (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/akun">
                        <UserRound className="mr-2 h-4 w-4" /> Dashboard akun
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/pesanan">
                        <ClipboardList className="mr-2 h-4 w-4" /> Pesanan saya
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/kurir">
                        <Trophy className="mr-2 h-4 w-4" /> Peringkat kurir
                      </Link>
                    </DropdownMenuItem>
                  </>
                ) : (

                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/akun">
                        <UserRound className="mr-2 h-4 w-4" /> Dashboard akun
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/pesanan">
                        <ClipboardList className="mr-2 h-4 w-4" /> Pesanan saya
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/kurir">
                        <Trophy className="mr-2 h-4 w-4" /> Peringkat kurir
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/masukan">
                        <MessageSquareHeart className="mr-2 h-4 w-4" /> Kritik, saran & request
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/admin">
                        <ShieldCheck className="mr-2 h-4 w-4" /> Dasbor admin
                      </Link>
                    </DropdownMenuItem>
                    {isOwner && (
                      <DropdownMenuItem asChild>
                        <Link to="/dashboard-kurir">
                          <Bike className="mr-2 h-4 w-4" /> Intip dashboard kurir
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild>
                      <Link to="/admin/katalog">Kelola katalog</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/toko">
                        <Store className="mr-2 h-4 w-4" /> Kelola toko/mitra
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/promo">
                        <BadgePercent className="mr-2 h-4 w-4" /> Promo & voucher
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/tim">
                        <Users className="mr-2 h-4 w-4" /> Jabatan tim
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/pengaturan">Pengaturan</Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void signOut()}>
                  <LogOut className="mr-2 h-4 w-4" /> Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth">Masuk</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
