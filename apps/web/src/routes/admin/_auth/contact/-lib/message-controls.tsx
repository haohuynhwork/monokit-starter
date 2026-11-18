import { Button } from "@packages/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@packages/ui/components/card";
import { useRouter } from "@tanstack/react-router";
import { useEffect, useTransition } from "react";
import { notify } from "@/components/toast";
import type { ContactMessageDetail, ContactMessageStatus } from "@/lib/types";
import {
  type ContactActionState,
  deleteMessage,
  openMessage,
  setMessageStatus,
} from "./actions";
import { STATUS_LABEL } from "./status";

export function MessageControls({
  message,
}: {
  message: ContactMessageDetail;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Viewing it marks a new message read; done here, not in the loader, so
  // link preloads don't count as opening it
  useEffect(() => {
    if (message.status === "new") {
      void openMessage(message.id).then((res) => {
        if (res.ok) {
          void router.invalidate();
        }
      });
    }
  }, [
    router,
    message.id,
    message.status,
  ]);

  const run = (action: () => Promise<ContactActionState>, after?: () => void) =>
    startTransition(async () => {
      const res = await action();
      if (!res.ok) {
        notify("Couldn't update the message", {
          description: res.message,
          kind: "error",
        });
        return;
      }
      if (after) {
        after();
      } else {
        await router.invalidate();
      }
    });

  const set = (status: ContactMessageStatus) =>
    run(() => setMessageStatus(message.id, status));

  const subject = `Re: ${message.subject ?? "your message"}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {message.email && (
          <Button asChild disabled={pending}>
            <a
              href={`mailto:${message.email}?subject=${encodeURIComponent(subject)}`}
              onClick={() => {
                if (message.status !== "replied") {
                  set("replied");
                }
              }}
            >
              Reply by email
            </a>
          </Button>
        )}
        <div className="flex flex-wrap gap-2">
          {(
            [
              "read",
              "replied",
              "spam",
              "archived",
            ] as const
          )
            .filter((s) => s !== message.status)
            .map((s) => (
              <Button
                key={s}
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => set(s)}
              >
                {s === "read"
                  ? "Mark read"
                  : `Mark ${STATUS_LABEL[s].toLowerCase()}`}
              </Button>
            ))}
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            className="text-destructive"
            onClick={() => {
              if (confirm("Delete this message?")) {
                run(
                  () => deleteMessage(message.id),
                  () =>
                    void router.navigate({
                      to: "/admin/contact",
                    }),
                );
              }
            }}
          >
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
