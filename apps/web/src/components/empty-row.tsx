import { TableCell, TableRow } from "@packages/ui/components/table";

// What an empty table says: a short title and what to do about it
export type EmptyText = {
  // Default "No records"
  title?: string;
  description?: React.ReactNode;
};

// The one row of a table with nothing in it: the columns stay visible, so
// an empty list still shows what it would hold
export function EmptyRow({
  colSpan,
  title = "No records",
  description,
}: EmptyText & {
  colSpan: number;
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="h-28 text-center">
        <p className="text-sm font-medium">{title}</p>
        {description && (
          <p className="mt-1 text-sm whitespace-normal text-muted-foreground">
            {description}
          </p>
        )}
      </TableCell>
    </TableRow>
  );
}

// For lists with filters: an empty result means "nothing matches" when one
// is set, else "nothing yet" plus how to add the first
export function emptyText(
  noun: string,
  filtered: boolean,
  firstHint: React.ReactNode,
): EmptyText {
  return filtered
    ? {
        title: `No ${noun} match`,
        description:
          "Nothing matches these filters. Clear them to see everything.",
      }
    : {
        title: `No ${noun} yet`,
        description: firstHint,
      };
}
