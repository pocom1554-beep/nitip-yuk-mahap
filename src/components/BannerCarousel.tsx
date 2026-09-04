import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import { useBanners } from "@/hooks/useBanners";

/** Carousel banner otomatis (geser tiap 4 detik), data dinamis dari database. */
export function BannerCarousel() {
  const { banners, urls, loading } = useBanners(true);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index >= banners.length) setIndex(0);
  }, [banners.length, index]);

  useEffect(() => {
    if (banners.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % banners.length), 4000);
    return () => clearInterval(t);
  }, [banners.length]);

  if (loading || banners.length === 0) return null;

  const geser = (d: number) => setIndex((i) => (i + d + banners.length) % banners.length);

  return (
    <section
      className="relative mt-4 overflow-hidden rounded-4xl shadow-[var(--shadow-pop)]"
      aria-roledescription="carousel"
      aria-label="Banner promosi"
    >
      <div
        className="flex transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {banners.map((b) => (
          <div
            key={b.id}
            className="relative aspect-[16/7] w-full shrink-0 bg-gradient-to-br from-[oklch(0.5_0.16_255)] via-[oklch(0.58_0.15_215)] to-[oklch(0.75_0.14_185)]"
          >
            {urls[b.image_path] ? (
              <img
                src={urls[b.image_path]}
                alt={b.title || "Banner NitipYuk"}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-primary-foreground/70">
                <ImageIcon className="h-8 w-8" />
              </div>
            )}
            {(b.title || b.subtitle) && (
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-[oklch(0.28_0.09_245/0.85)] via-[oklch(0.28_0.09_245/0.25)] to-transparent p-5 text-primary-foreground sm:p-8">
                {b.title && (
                  <h2 className="font-display text-2xl font-black leading-tight sm:text-4xl">{b.title}</h2>
                )}
                {b.subtitle && <p className="mt-1 max-w-lg text-sm sm:text-base">{b.subtitle}</p>}
              </div>
            )}
          </div>
        ))}
      </div>

      {banners.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Banner sebelumnya"
            onClick={() => geser(-1)}
            className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground shadow-[var(--shadow-soft)] transition hover:bg-background"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Banner berikutnya"
            onClick={() => geser(1)}
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground shadow-[var(--shadow-soft)] transition hover:bg-background"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {banners.map((b, i) => (
              <button
                key={b.id}
                type="button"
                aria-label={`Ke banner ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-2 rounded-full transition-all ${
                  i === index ? "w-6 bg-primary-foreground" : "w-2 bg-primary-foreground/50"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
