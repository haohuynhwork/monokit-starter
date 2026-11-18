import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@packages/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@packages/ui/components/dropdown-menu";
import { Camera, Images, Link2, Upload } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useRef } from "react";
import { CameraCapture } from "@/components/camera-capture";

// Choosing an image for a cover or gallery slot: Upload / Camera / Link /
// From library

// What covers and gallery images can be (the api's image policy)
export const IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

export type ImageSource = "upload" | "camera" | "link" | "library";

// Local preview URLs for chosen files, freed when the card goes away
export function useObjectUrls(): (file: File) => string {
  const urls = useRef<string[]>([]);
  useEffect(
    () => () => {
      for (const url of urls.current) {
        URL.revokeObjectURL(url);
      }
    },
    [],
  );
  return useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    urls.current.push(url);
    return url;
  }, []);
}

// The camera in a dialog; it runs only while the dialog is open
export function CameraDialog({
  open,
  onClose,
  onCapture,
}: {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Take a photo</DialogTitle>
        </DialogHeader>
        {open && <CameraCapture onCapture={onCapture} />}
      </DialogContent>
    </Dialog>
  );
}

// Upload / Camera / Link / From library, for an empty slot or to replace
// an image
export function ImageSourceMenu({
  label,
  align,
  onChoose,
  children,
}: {
  label: string;
  align: "start" | "end";
  onChoose: (source: ImageSource) => void;
  children: ReactNode;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => onChoose("upload")}>
          <Upload /> Upload
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onChoose("camera")}>
          <Camera /> Camera
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onChoose("link")}>
          <Link2 /> Link
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onChoose("library")}>
          <Images /> From library
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
