import { Button } from "@packages/ui/components/button";
import { Camera } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// A live camera view; the shutter hands over a JPEG. The camera is on
// only while this is shown.
export function CameraCapture({
  onCapture,
}: {
  onCapture: (file: File) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser can't use the camera here (it needs https).");
      return;
    }
    let stream: MediaStream | null = null;
    let stopped = false;
    navigator.mediaDevices
      .getUserMedia({
        video: {
          // The back camera on phones
          facingMode: "environment",
          width: {
            ideal: 1920,
          },
        },
      })
      .then((s) => {
        if (stopped) {
          for (const track of s.getTracks()) {
            track.stop();
          }
          return;
        }
        stream = s;
        if (video.current) {
          video.current.srcObject = s;
        }
      })
      .catch((e: unknown) => {
        setError(
          e instanceof DOMException && e.name === "NotAllowedError"
            ? "Camera access was blocked. Allow it in the browser to take a photo."
            : "No camera is available.",
        );
      });
    return () => {
      stopped = true;
      for (const track of stream?.getTracks() ?? []) {
        track.stop();
      }
    };
  }, []);
  const shoot = () => {
    const v = video.current;
    if (!v?.videoWidth) {
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext("2d")?.drawImage(v, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCapture(
            new File(
              [
                blob,
              ],
              `photo-${Date.now()}.jpg`,
              {
                type: "image/jpeg",
              },
            ),
          );
        }
      },
      "image/jpeg",
      0.9,
    );
  };
  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      <video
        ref={video}
        autoPlay
        playsInline
        muted
        onLoadedData={() => setReady(true)}
        className="aspect-video w-full rounded-md border bg-muted object-cover"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!ready}
        onClick={shoot}
      >
        <Camera />
        {ready ? "Take photo" : "Starting camera…"}
      </Button>
    </div>
  );
}
