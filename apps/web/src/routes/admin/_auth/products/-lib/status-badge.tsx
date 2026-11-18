import { Badge } from "@packages/ui/components/badge";
import type { ProductStatus } from "@/lib/types";

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  if (status === "active") {
    return <Badge>Active</Badge>;
  }
  if (status === "archived") {
    return <Badge variant="outline">Archived</Badge>;
  }
  return <Badge variant="secondary">Draft</Badge>;
}
