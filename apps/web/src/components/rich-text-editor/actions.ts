import { api } from "@/lib/api";

// A body as saving would store it (the api's sanitizer), for the preview
export async function previewContent(html: string): Promise<{
  html?: string;
  message?: string;
}> {
  const res = await api<{
    html: string;
  }>("/content/preview", {
    method: "POST",
    body: {
      html,
    },
  });
  if (res.status !== "success" || !res.data) {
    return {
      message: res.message ?? "Could not load the preview.",
    };
  }
  return {
    html: res.data.html,
  };
}
