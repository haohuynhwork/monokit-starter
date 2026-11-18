import type { Asset } from "@packages/contracts";

// 'image/png' -> 'PNG', 'application/pdf' -> 'PDF'; folders and links by kind
export function typeLabel(item: Asset): string {
  if (item.kind === "directory") {
    return "Folder";
  }
  if (item.kind === "link") {
    return "Link";
  }
  const sub = item.mimeType?.split("/")[1] ?? "";
  return sub ? sub.replace(/^x-/, "").split(/[+.;]/)[0]!.toUpperCase() : "File";
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    dateStyle: "medium",
  });
}

// Everything known about an item, for its tooltip
export function details(item: Asset): string {
  return [
    item.name,
    [
      typeLabel(item),
      item.mimeType,
      formatSize(item.sizeBytes),
    ]
      .filter(Boolean)
      .join(" · "),
    `Added ${new Date(item.createdAt).toLocaleString()}`,
    `Modified ${new Date(item.updatedAt).toLocaleString()}`,
    `/${item.path}`,
  ].join("\n");
}

export function formatSize(bytes: string | null): string {
  if (bytes === null) {
    return "";
  }
  const n = Number(bytes);
  if (n < 1024) {
    return `${n} B`;
  }
  if (n < 1024 * 1024) {
    return `${(n / 1024).toFixed(0)} KB`;
  }
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
