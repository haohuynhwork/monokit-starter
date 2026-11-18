import { Alert, AlertDescription } from "@packages/ui/components/alert";
import { Button } from "@packages/ui/components/button";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { api } from "@/lib/api";

// Pending orders only; the api restocks
export function CancelButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();

  const cancel = async () => {
    if (!confirm("Cancel this order?")) {
      return;
    }
    setPending(true);
    setMessage(undefined);
    const res = await api(`/me/orders/${encodeURIComponent(id)}/cancel`, {
      method: "POST",
    });
    setPending(false);
    if (res.status !== "success") {
      setMessage(res.message ?? "Something went wrong.");
      return;
    }
    await router.invalidate();
  };

  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={cancel}
      >
        {pending ? "Cancelling…" : "Cancel order"}
      </Button>
      {message && (
        <Alert variant="destructive" className="w-auto">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
