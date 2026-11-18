import { toast } from "@packages/ui/components/sonner";
import {
  Check,
  CircleCheck,
  Copy,
  Info,
  OctagonX,
  TriangleAlert,
  X,
} from "lucide-react";
import { useState } from "react";

type Kind = "success" | "error" | "warning" | "info";

const ICONS = {
  success: <CircleCheck className="size-4 text-emerald-600" />,
  error: <OctagonX className="size-4 text-destructive" />,
  warning: <TriangleAlert className="size-4 text-amber-500" />,
  info: <Info className="size-4 text-muted-foreground" />,
};

// A toast with a copy button (copies title + description, e.g. an error to
// paste into a report) and a dismiss X in the top right corner
export function notify(
  title: string,
  opts: {
    description?: string;
    kind?: Kind;
    duration?: number;
  } = {},
) {
  return toast.custom(
    (id) => (
      <ToastCard
        title={title}
        description={opts.description}
        kind={opts.kind ?? "info"}
        onDismiss={() => toast.dismiss(id)}
      />
    ),
    {
      duration: opts.duration ?? (opts.kind === "error" ? 10_000 : 4_000),
    },
  );
}

function ToastCard({
  title,
  description,
  kind,
  onDismiss,
}: {
  title: string;
  description?: string;
  kind: Kind;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(
      description ? `${title}\n${description}` : title,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="relative flex w-[356px] max-w-[calc(100vw-2rem)] gap-3 rounded-lg border bg-popover p-4 pr-16 text-popover-foreground shadow-lg">
      <span className="mt-0.5 shrink-0">{ICONS[kind]}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-sm font-medium">{title}</p>
        {description && (
          <p className="text-sm break-words text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <div className="absolute top-2 right-2 flex gap-0.5">
        <button
          type="button"
          aria-label={copied ? "Copied" : "Copy"}
          title={copied ? "Copied" : "Copy"}
          onClick={copy}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </button>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
