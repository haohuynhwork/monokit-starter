import { Button } from "@packages/ui/components/button";
import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

// Opens a blank editor; the page (or layout) is created on its first save
export function NewItem({ kind }: { kind: "page" | "layout" }) {
  return (
    <Button size="sm" asChild>
      <Link
        to={kind === "page" ? "/admin/pages/new" : "/admin/pages/layouts/new"}
      >
        <Plus /> New {kind}
      </Link>
    </Button>
  );
}
