import { useState } from "react";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { StarRating } from "@/components/StarRating";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Props = {
  orderId: string;
  courierId: string | null;
  itemNames: string[];
  existing?: { stars: number; comment: string } | null;
  onDone?: () => void;
};

export function RateOrderDialog({ orderId, courierId, itemNames, existing, onDone }: Props) {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [stars, setStars] = useState(existing?.stars ?? 5);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [saving, setSaving] = useState(false);

  const simpan = async () => {
    if (!user) return;
    setSaving(true);
    let storeName = "";
    if (itemNames.length > 0) {
      const { data } = await supabase
        .from("products")
        .select("name, store_name")
        .in("name", itemNames.slice(0, 10));
      storeName = data?.find((p) => p.store_name)?.store_name ?? "";
    }
    const { error } = await supabase.from("courier_ratings").upsert(
      {
        order_id: orderId,
        customer_id: user.id,
        courier_id: courierId,
        customer_name: profile?.full_name || "Konsumen",
        store_name: storeName,
        stars,
        comment: comment.trim(),
      },
      { onConflict: "order_id" },
    );
    setSaving(false);
    if (error) {
      toast.error("Gagal menyimpan ulasan", { description: error.message });
      return;
    }
    toast.success("Terima kasih atas ulasannya!");
    setOpen(false);
    onDone?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" className="mt-2 w-full font-semibold">
          <Star className="h-4 w-4" /> {existing ? "Ubah ulasan" : "Beri rating kurir"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-xl">Nilai pengantaran</DialogTitle>
          <DialogDescription>
            Bagaimana pelayanan kurir untuk pesanan #{orderId.slice(0, 8)}?
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center py-2">
          <StarRating value={stars} onChange={setStars} size="lg" />
        </div>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Ceritakan pengalamanmu (opsional)"
          rows={3}
        />
        <DialogFooter>
          <Button onClick={() => void simpan()} disabled={saving} className="w-full">
            {saving ? "Menyimpan..." : "Kirim ulasan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
