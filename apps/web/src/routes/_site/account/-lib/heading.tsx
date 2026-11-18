// Title (and optional line) at the top of each account page
export function Heading({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {children && (
        <p className="mt-1 text-sm text-muted-foreground">{children}</p>
      )}
    </div>
  );
}

export const Loading = () => (
  <p className="text-sm text-muted-foreground">Loading…</p>
);
