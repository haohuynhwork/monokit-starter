import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@packages/ui/components/card";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Empty } from "@/components/pager";
import { CONTENT_CLASS, contentCss } from "@/components/rich-text-editor";
import { api } from "@/lib/api";
import { isStaff } from "@/lib/auth";
import type { ContactMessageDetail } from "@/lib/types";
import { MessageControls } from "@/routes/admin/_auth/contact/-lib/message-controls";
import { MessageStatusBadge } from "@/routes/admin/_auth/contact/-lib/status-badge";

// Staff only; the api checks the role too. An unknown id is a 404.
export const Route = createFileRoute("/admin/_auth/contact/$id")({
  loader: async ({ context, params }) => {
    if (!isStaff(context.user)) {
      return {
        message: null,
      };
    }
    if (!/^[1-9]\d*$/.test(params.id)) {
      throw notFound();
    }
    const res = await api<ContactMessageDetail>(
      `/contact/messages/${params.id}`,
    );
    if (res.status !== "success" || !res.data) {
      throw notFound();
    }
    return {
      message: res.data,
    };
  },
  pendingComponent: () => (
    <p className="text-sm text-muted-foreground">Loading…</p>
  ),
  component: MessagePage,
});

function MessagePage() {
  return (
    <div className="flex flex-col gap-4">
      <Link
        to="/admin/contact"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Messages
      </Link>
      <Loaded />
    </div>
  );
}

function Loaded() {
  const { message: m } = Route.useLoaderData();
  if (!m) {
    return <Empty>Only admins and editors can read contact messages.</Empty>;
  }

  const details: [
    string,
    React.ReactNode,
  ][] = [
    [
      "Name",
      m.name,
    ],
    [
      "Email",
      m.email && (
        <a href={`mailto:${m.email}`} className="hover:underline">
          {m.email}
        </a>
      ),
    ],
    [
      "Phone",
      m.phone && (
        <a href={`tel:${m.phone}`} className="hover:underline">
          {m.phone}
        </a>
      ),
    ],
    [
      "Received",
      new Date(m.createdAt).toLocaleString(),
    ],
    [
      "Mailed",
      m.mailedAt
        ? new Date(m.mailedAt).toLocaleString()
        : "No (email off or failed)",
    ],
    [
      "IP",
      m.ip,
    ],
    [
      "Browser",
      m.userAgent,
    ],
  ];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {m.subject ?? "No subject"}
            <MessageStatusBadge status={m.status} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {m.message && m.messageFormat === "html" ? (
            // Sanitized by the api when it was saved
            <MessageBody html={m.message} />
          ) : (
            <p className="whitespace-pre-wrap break-words text-sm">
              {m.message ?? "(no message)"}
            </p>
          )}
        </CardContent>
      </Card>
      <div className="flex flex-col gap-4">
        <MessageControls message={m} />
        <Card>
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
              {details
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="min-w-0 break-words">{v}</dd>
                  </div>
                ))}
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Rich text as the site shows it (the web's PostBody): the content styles
// shared with the editor
function MessageBody({ html }: { html: string }) {
  return (
    <>
      {/* React hoists it into <head> */}
      <link rel="stylesheet" href={contentCss()} precedence="default" />
      <div
        className={CONTENT_CLASS}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized server-side
        dangerouslySetInnerHTML={{
          __html: html,
        }}
      />
    </>
  );
}
