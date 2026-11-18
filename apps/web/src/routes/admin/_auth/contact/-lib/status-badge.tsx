import { Badge } from "@packages/ui/components/badge";
import type { ContactMessageStatus } from "@/lib/types";
import { STATUS_LABEL } from "./status";

export function MessageStatusBadge({
  status,
}: {
  status: ContactMessageStatus;
}) {
  const variant =
    status === "new"
      ? "default"
      : status === "spam" || status === "archived"
        ? "outline"
        : "secondary";
  return <Badge variant={variant}>{STATUS_LABEL[status]}</Badge>;
}
