import { Star } from "lucide-react";

export function StarRating({
  value,
  onChange,
  size = "md",
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: "sm" | "md" | "lg";
}) {
  const cls = size === "lg" ? "h-7 w-7" : size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const active = n <= Math.round(value);
        const star = (
          <Star
            className={`${cls} ${active ? "fill-warning text-warning" : "text-muted-foreground/40"}`}
          />
        );
        return onChange ? (
          <button
            key={n}
            type="button"
            aria-label={`Beri ${n} bintang`}
            onClick={() => onChange(n)}
            className="transition-transform hover:scale-110"
          >
            {star}
          </button>
        ) : (
          <span key={n}>{star}</span>
        );
      })}
    </div>
  );
}
