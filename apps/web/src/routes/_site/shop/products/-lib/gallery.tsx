import { cn } from "@packages/ui/lib/utils";
import { type CSSProperties, useEffect, useState } from "react";
import type { Swiper as SwiperClass } from "swiper";
import { A11y, FreeMode, Keyboard, Navigation, Thumbs } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/free-mode";
import "swiper/css/navigation";
import "swiper/css/thumbs";
import { useLightbox } from "@/components/lightbox/use-lightbox";
import { useSelection } from "./variant-picker";

// Product images: a Swiper slider (swipe, arrows, keyboard) with a
// thumbnail strip; clicking an image opens GLightbox full screen.
// `captions` (by URL) shows a gallery image's title and description, also
// in the lightbox.
export type Captions = Record<
  string,
  {
    title: string | null;
    description: string | null;
  }
>;

export function Gallery({
  images,
  alt,
  active,
  captions = {},
}: {
  images: string[];
  alt: string;
  // Shown when it changes (the chosen variant's image)
  active?: string | null;
  captions?: Captions;
}) {
  const group = useLightbox(images.join("\n"));
  const [main, setMain] = useState<SwiperClass | null>(null);
  const [thumbs, setThumbs] = useState<SwiperClass | null>(null);
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const i = active ? images.indexOf(active) : -1;
    if (i >= 0) {
      main?.slideTo(i);
    }
  }, [
    active,
    images,
    main,
  ]);

  if (images.length === 0) {
    return <div className="aspect-square rounded-lg bg-muted" />;
  }
  const caption = captions[images[Math.min(current, images.length - 1)]];
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
        <Swiper
          modules={[
            Navigation,
            Keyboard,
            A11y,
            Thumbs,
          ]}
          onSwiper={setMain}
          onSlideChange={(s) => setCurrent(s.activeIndex)}
          navigation={images.length > 1}
          keyboard
          // Destroyed thumbs (images changed) would break the link
          thumbs={{
            swiper: thumbs && !thumbs.destroyed ? thumbs : null,
          }}
          className="size-full"
          // Arrows in the theme's colors (Swiper's default is blue)
          style={
            {
              "--swiper-theme-color": "var(--foreground)",
              "--swiper-navigation-size": "24px",
            } as CSSProperties
          }
        >
          {images.map((src) => {
            const c = captions[src];
            return (
              <SwiperSlide key={src}>
                {/* GLightbox opens on click; Swiper swallows the click
                    that ends a drag, so swiping doesn't open it */}
                <a
                  href={src}
                  data-gallery={group}
                  data-title={c?.title ?? undefined}
                  data-description={c?.description ?? undefined}
                  className="block size-full"
                >
                  <img
                    src={src}
                    alt={c?.title ?? alt}
                    className="size-full object-cover"
                  />
                </a>
              </SwiperSlide>
            );
          })}
        </Swiper>
        {(caption?.title || caption?.description) && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-background/80 px-3 py-2 text-sm">
            {caption.title && <p className="font-medium">{caption.title}</p>}
            {caption.description && (
              <p className="line-clamp-2 text-muted-foreground">
                {caption.description}
              </p>
            )}
          </div>
        )}
      </div>
      {images.length > 1 && (
        <Swiper
          modules={[
            Thumbs,
            FreeMode,
          ]}
          onSwiper={setThumbs}
          slidesPerView="auto"
          spaceBetween={8}
          freeMode
          watchSlidesProgress
          className="w-full"
        >
          {images.map((src, i) => (
            <SwiperSlide key={src} className="!w-16">
              <button
                type="button"
                aria-label={`Image ${i + 1}`}
                aria-current={i === current}
                className={cn(
                  "size-16 overflow-hidden rounded-md border-2 bg-muted",
                  i === current ? "border-primary" : "border-transparent",
                )}
              >
                <img src={src} alt="" className="size-full object-cover" />
              </button>
            </SwiperSlide>
          ))}
        </Swiper>
      )}
    </div>
  );
}

// The gallery plus the variant and option value images, showing the
// chosen variant's (inside VariantProvider)
export function VariantGallery({
  images,
  alt,
  captions,
}: {
  images: string[];
  alt: string;
  captions?: Captions;
}) {
  const { product, variant } = useSelection();
  const extra = [
    ...product.variants.map((v) => v.imageUrl),
    ...product.options.flatMap((o) =>
      Object.values(o.images ?? {}).map((a) => a.url),
    ),
  ].filter((u): u is string => !!u && !images.includes(u));
  const all = [
    ...images,
    ...new Set(extra),
  ];
  return (
    <Gallery
      images={all}
      alt={alt}
      active={variant?.imageUrl}
      captions={captions}
    />
  );
}
