import { Button } from "@packages/ui/components/button";
import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

// Opens a blank editor; the post is created on its first save
export function NewPost() {
  return (
    <Button size="sm" asChild>
      <Link to="/admin/posts/new">
        <Plus /> New post
      </Link>
    </Button>
  );
}
