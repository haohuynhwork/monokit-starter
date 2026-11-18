import { Alert, AlertDescription } from "@packages/ui/components/alert";
import { Button } from "@packages/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@packages/ui/components/dialog";
import { FieldGroup } from "@packages/ui/components/field";
import { type FormEvent, useState } from "react";
import type { MediaState } from "./actions";

// A dialog with one form; closes itself on success
export function FormDialog({
  trigger,
  triggerVariant = "outline",
  title,
  description,
  action,
  parentId,
  hidden,
  submitLabel,
  children,
  open: controlledOpen,
  onOpenChange,
  onSuccess,
}: {
  trigger?: React.ReactNode;
  triggerVariant?: "outline" | "ghost";
  title: string;
  description?: string;
  action: (formData: FormData) => Promise<MediaState>;
  parentId?: string | null;
  hidden?: Record<string, string>;
  submitLabel: string;
  // A function gets each field's error, to show under its input
  children:
    | React.ReactNode
    | ((fieldError: (name: string) => string | undefined) => React.ReactNode);
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const [ownOpen, setOwnOpen] = useState(false);
  const open = controlledOpen ?? ownOpen;
  const setOpen = onOpenChange ?? setOwnOpen;
  const [state, setState] = useState<MediaState>({});
  const [pending, setPending] = useState(false);

  // Keeps what was typed when it fails (no form reset)
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    const res = await action(new FormData(e.currentTarget));
    setPending(false);
    setState(res);
    if (res.ok) {
      setOpen(false);
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && (
        <DialogTrigger asChild>
          <Button variant={triggerVariant} size="sm">
            {trigger}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <form noValidate onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>
          <FieldGroup className="py-4">
            {parentId !== undefined && (
              <input type="hidden" name="parentId" value={parentId ?? ""} />
            )}
            {Object.entries(hidden ?? {}).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
            {!state.ok && state.message && !state.fieldErrors && (
              <Alert variant="destructive">
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            )}
            {typeof children === "function"
              ? children((name) => state.fieldErrors?.[name])
              : children}
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
