import { Button } from "@packages/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@packages/ui/components/popover";
import { useRouter } from "@tanstack/react-router";
import { ImageIcon, X } from "lucide-react";
import { useState, useTransition } from "react";
import { notify } from "@/components/toast";
import type { ShopActionState } from "@/lib/shop";
import type { AttachedAsset, Product } from "@/lib/types";

// The product's photos (cover, then gallery), which variant and option
// value images are picked from
export function productPhotos(product: Product): AttachedAsset[] {
  const all = [
    ...(product.cover
      ? [
          product.cover,
        ]
      : []),
    ...product.gallery,
  ];
  return all.filter(
    (a, i) => all.findIndex((b) => b.assetId === a.assetId) === i,
  );
}

// A thumbnail button that opens the product's photos; picking one (or
// "None") saves right away through `save`
export function PhotoPicker({
  label,
  current,
  photos,
  save,
}: {
  // What the image is for, e.g. "M / Red" or "Color: Red"
  label: string;
  current: AttachedAsset | null;
  photos: AttachedAsset[];
  save: (assetId: string | null) => Promise<ShopActionState>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const pick = (assetId: string | null) => {
    setOpen(false);
    startTransition(async () => {
      const res = await save(assetId);
      notify(res.ok ? (res.message ?? "Saved") : "Couldn't change the image", {
        kind: res.ok ? "success" : "error",
        description: res.ok ? undefined : res.message,
      });
      if (res.ok) {
        await router.invalidate();
      }
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={pending}
          aria-label={`Image, ${label}`}
          className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/40 text-muted-foreground hover:bg-muted disabled:opacity-50"
        >
          {current ? (
            <img src={current.url} alt="" className="size-full object-cover" />
          ) : (
            <ImageIcon className="size-4" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <PopoverHeader>
          <PopoverTitle>Image for {label}</PopoverTitle>
          <PopoverDescription>
            {photos.length
              ? "Pick one of the product's photos."
              : "Add a cover or gallery images first."}
          </PopoverDescription>
        </PopoverHeader>
        {photos.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {photos.map((p) => (
              <button
                key={p.assetId}
                type="button"
                onClick={() => pick(p.assetId)}
                aria-pressed={p.assetId === current?.assetId}
                className="aspect-square overflow-hidden rounded-md border aria-pressed:ring-2 aria-pressed:ring-primary"
              >
                <img src={p.url} alt="" className="size-full object-cover" />
              </button>
            ))}
          </div>
        )}
        {current && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => pick(null)}
          >
            <X /> Remove image
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
