import type { LucideIcon } from "lucide-react";
import {
  Apple,
  Baby,
  Beef,
  Cake,
  Candy,
  Coffee,
  CookingPot,
  Croissant,
  CupSoda,
  Cigarette,
  Drumstick,
  Fish,
  GlassWater,
  IceCream2,
  LayoutGrid,
  Milk,
  Package,
  Pill,
  Popcorn,
  Shirt,
  ShoppingBasket,
  Sparkles,
  Utensils,
  Wheat,
} from "lucide-react";

const RULES: { keys: string[]; icon: LucideIcon }[] = [
  { keys: ["semua"], icon: LayoutGrid },
  { keys: ["camilan", "cemilan", "snack", "keripik", "jajan"], icon: Popcorn },
  { keys: ["permen", "coklat", "cokelat", "manis"], icon: Candy },
  { keys: ["kue", "roti", "bakery", "bolu"], icon: Cake },
  { keys: ["gorengan", "pastry", "donat"], icon: Croissant },
  { keys: ["es ", "es krim", "ice", "dingin"], icon: IceCream2 },
  { keys: ["kopi", "coffee", "teh panas"], icon: Coffee },
  { keys: ["minuman dingin", "soda", "soft drink"], icon: CupSoda },
  { keys: ["susu", "yogurt", "dairy"], icon: Milk },
  { keys: ["air", "galon", "mineral"], icon: GlassWater },
  { keys: ["minuman", "jus", "drink"], icon: CupSoda },
  { keys: ["makanan berat", "nasi", "masakan", "catering", "warung"], icon: CookingPot },
  { keys: ["ayam", "unggas"], icon: Drumstick },
  { keys: ["daging", "sapi"], icon: Beef },
  { keys: ["ikan", "seafood", "laut"], icon: Fish },
  { keys: ["sayur", "buah", "segar"], icon: Apple },
  { keys: ["sembako", "beras", "tepung", "gula", "minyak"], icon: Wheat },
  { keys: ["obat", "apotek", "kesehatan", "medis"], icon: Pill },
  { keys: ["bayi", "popok", "anak"], icon: Baby },
  { keys: ["baju", "pakaian", "fashion"], icon: Shirt },
  { keys: ["rokok", "tembakau"], icon: Cigarette },
  { keys: ["kosmetik", "kecantikan", "skincare", "sabun", "mandi"], icon: Sparkles },
  { keys: ["belanja", "harian", "kelontong"], icon: ShoppingBasket },
  { keys: ["makanan", "food"], icon: Utensils },
];

/** Pilih ikon yang paling cocok untuk sebuah nama kategori. */
export function categoryIcon(name: string): LucideIcon {
  const n = (name ?? "").toLowerCase().trim();
  for (const r of RULES) {
    if (r.keys.some((k) => n.includes(k.trim()))) return r.icon;
  }
  return Package;
}
