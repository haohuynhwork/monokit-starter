import { Button } from "@packages/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@packages/ui/components/card";
import { CircleCheck, Info, OctagonX, TriangleAlert } from "lucide-react";
import { notify } from "@/components/toast";

// One sample per kind, with a description so the copy button has something
// to copy
const SAMPLES = [
  {
    kind: "success",
    label: "Success",
    Icon: CircleCheck,
    title: "Saved",
    description: "Your changes are live.",
  },
  {
    kind: "info",
    label: "Info",
    Icon: Info,
    title: "Heads up",
    description: "This is how an information message looks.",
  },
  {
    kind: "warning",
    label: "Warning",
    Icon: TriangleAlert,
    title: "Check this",
    description: "Something may need your attention.",
  },
  {
    kind: "error",
    label: "Error",
    Icon: OctagonX,
    title: "Something went wrong",
    description: "Request failed with status 500 (internal_error).",
  },
] as const;

// Not a stored setting: shows each toast kind, to check their look (light
// and dark), stacking and the copy/dismiss buttons
export function TestToastCard() {
  return (
    <Card id="toasts" className="scroll-mt-18">
      <CardHeader>
        <CardTitle>Toasts</CardTitle>
        <CardDescription>
          Show each kind of toast. Click several to see them stack.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {SAMPLES.map(({ kind, label, Icon, title, description }) => (
          <Button
            key={kind}
            variant="outline"
            size="sm"
            onClick={() =>
              notify(title, {
                kind,
                description,
              })
            }
          >
            <Icon /> {label}
          </Button>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => notify("Just a title")}
        >
          Title only
        </Button>
      </CardContent>
    </Card>
  );
}
