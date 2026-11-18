import { Button } from "@packages/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@packages/ui/components/dropdown-menu";
import { cn } from "@packages/ui/lib/utils";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, BellOff, BellRing, Mail, MailOpen, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { io } from "socket.io-client";
import { assetUrl, withBase } from "@/lib/url";
import {
  clearReadNotifications,
  deleteNotification,
  getRealtimeTicket,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
  type Notification,
} from "./api";
import { useTabBadge } from "./use-tab-badge";

// The header's bell: unread count, latest notifications, live updates over
// the api's /realtime socket
export function NotificationBell() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  // The socket also echoes this tab's own changes; these let its handlers
  // skip what's already applied, so the count isn't lowered twice
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [
    items,
  ]);
  const removedRef = useRef(new Set<string>());
  const [cursor, setCursor] = useState<string | null>(null);
  const [ring, setRing] = useState(false);
  const [pending, startTransition] = useTransition();
  const navigate = useNavigate();
  // The newest one, flashed in the tab title while the tab is hidden
  const [alert, setAlert] = useState<string | null>(null);
  const clearAlert = useCallback(() => setAlert(null), []);
  useTabBadge(unread, alert, clearAlert);
  const permission = useSyncExternalStore(
    onPermissionChange,
    readPermission,
    () => "unsupported",
  );

  // First page, then live: new ones arrive pushed, reads sync across tabs
  useEffect(() => {
    let active = true;
    void listNotifications().then((page) => {
      if (active && page) {
        setItems(page.items);
        setUnread(page.unread);
        setCursor(page.nextCursor);
      }
    });

    // Same origin, like /api: the panel's server proxies /socket.io to the api
    const socket = io("/realtime", {
      path: withBase("/socket.io"),
      transports: [
        "websocket",
      ],
      // Connected below, once StrictMode's dev remount is past
      autoConnect: false,
      // A fresh ticket on every (re)connect; they expire after a minute
      auth: (cb) => {
        void getRealtimeTicket().then((ticket) =>
          cb({
            ticket,
          }),
        );
      },
    });
    socket.on("notification", (n: Notification) => {
      setItems((prev) => [
        n,
        ...prev.filter((p) => p.id !== n.id),
      ]);
      setUnread((u) => u + 1);
      setRing(true);
      showDesktop(n, (to) => void navigate(to));
      if (document.hidden) {
        setAlert(`🔔 ${describe(n)}`);
      }
    });
    socket.on("notification:read", ({ id }: { id: string }) => {
      if (itemsRef.current.find((p) => p.id === id)?.read) {
        return;
      }
      setItems((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                read: true,
              }
            : p,
        ),
      );
      setUnread((u) => Math.max(0, u - 1));
    });
    socket.on("notification:unread", ({ id }: { id: string }) => {
      if (itemsRef.current.find((p) => p.id === id)?.read === false) {
        return;
      }
      setItems((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                read: false,
              }
            : p,
        ),
      );
      setUnread((u) => u + 1);
    });
    socket.on(
      "notification:deleted",
      ({ id, wasUnread }: { id: string; wasUnread: boolean }) => {
        // Deleted here: already applied
        if (removedRef.current.delete(id)) {
          return;
        }
        setItems((prev) => prev.filter((p) => p.id !== id));
        if (wasUnread) {
          setUnread((u) => Math.max(0, u - 1));
        }
      },
    );
    socket.on("notification:cleared-read", () => {
      setItems((prev) => prev.filter((p) => !p.read));
    });
    socket.on("notification:read-all", () => {
      setItems((prev) =>
        prev.map((p) => ({
          ...p,
          read: true,
        })),
      );
      setUnread(0);
    });
    // Deferred: StrictMode's dev mount/unmount/mount would otherwise close
    // the first socket mid-handshake (an EPIPE in the dev proxy)
    const connect = setTimeout(() => socket.connect(), 0);
    return () => {
      active = false;
      clearTimeout(connect);
      socket.close();
    };
  }, [
    navigate,
  ]);

  // The bell wiggles once per new notification
  useEffect(() => {
    if (!ring) {
      return;
    }
    const timer = setTimeout(() => setRing(false), 1200);
    return () => clearTimeout(timer);
  }, [
    ring,
  ]);

  const open = (n: Notification) => {
    if (!n.read) {
      setItems((prev) =>
        prev.map((p) =>
          p.id === n.id
            ? {
                ...p,
                read: true,
              }
            : p,
        ),
      );
      setUnread((u) => Math.max(0, u - 1));
      void markNotificationRead(n.id);
    }
  };

  const markUnread = (n: Notification) => {
    if (n.read) {
      setItems((prev) =>
        prev.map((p) =>
          p.id === n.id
            ? {
                ...p,
                read: false,
              }
            : p,
        ),
      );
      setUnread((u) => u + 1);
      void markNotificationUnread(n.id);
    }
  };

  const remove = (n: Notification) => {
    removedRef.current.add(n.id);
    setItems((prev) => prev.filter((p) => p.id !== n.id));
    if (!n.read) {
      setUnread((u) => Math.max(0, u - 1));
    }
    void deleteNotification(n.id);
  };

  const clearRead = () =>
    startTransition(async () => {
      setItems((prev) => prev.filter((p) => !p.read));
      await clearReadNotifications();
    });

  const readAll = () =>
    startTransition(async () => {
      setItems((prev) =>
        prev.map((p) => ({
          ...p,
          read: true,
        })),
      );
      setUnread(0);
      await markAllNotificationsRead();
    });

  const enableDesktop = () => {
    void window.Notification.requestPermission().then(permissionChanged);
  };

  const loadMore = () =>
    startTransition(async () => {
      const page = cursor ? await listNotifications(cursor) : null;
      if (page) {
        setItems((prev) => [
          ...prev,
          ...page.items,
        ]);
        setCursor(page.nextCursor);
      }
    });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative"
          aria-label={
            unread ? `Notifications, ${unread} unread` : "Notifications"
          }
        >
          <Bell className={cn(ring && "animate-bounce")} />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[0.625rem] leading-4 font-semibold text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          <div className="flex gap-1">
            {/* Always shown; disabled when there's nothing to do */}
            <Button
              variant="ghost"
              size="xs"
              disabled={pending || unread === 0}
              onClick={readAll}
            >
              Mark all read
            </Button>
            <Button
              variant="ghost"
              size="xs"
              disabled={pending || !items.some((n) => n.read)}
              onClick={clearRead}
            >
              Clear read
            </Button>
          </div>
        </div>
        <DropdownMenuSeparator />
        {/* Desktop alerts: ask, or say where it's changed (once allowed or
            blocked, only the browser's site settings can change it) */}
        {permission === "default" && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={enableDesktop}
          >
            <BellRing />
            Show desktop alerts
          </Button>
        )}
        {(permission === "granted" || permission === "denied") && (
          <p className="flex items-start gap-2 px-2 py-1.5 text-xs text-muted-foreground">
            {permission === "granted" ? (
              <BellRing className="mt-px size-3.5 shrink-0" />
            ) : (
              <BellOff className="mt-px size-3.5 shrink-0" />
            )}
            <span>
              {permission === "granted"
                ? "Desktop alerts are on. Turn them off in the browser's site settings (icon left of the address)."
                : "Desktop alerts are blocked. Allow them in the browser's site settings (icon left of the address), then reload."}
            </span>
          </p>
        )}
        {items.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            Nothing yet.
          </p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {items.map((n) => (
              // The link is the menu item; the actions sit beside it, since
              // buttons can't go inside a link
              <div
                key={n.id}
                className="group/row flex items-start gap-1 rounded-md hover:bg-muted/60"
              >
                <DropdownMenuItem
                  asChild
                  className="min-w-0 flex-1 focus:bg-transparent"
                  onSelect={() => open(n)}
                >
                  <Link
                    {...target(n)}
                    className="flex items-start gap-2 whitespace-normal"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "mt-1.5 size-2 shrink-0 rounded-full",
                        n.read ? "bg-transparent" : "bg-primary",
                      )}
                    />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className={cn("text-sm", !n.read && "font-medium")}>
                        {describe(n)}
                      </span>
                      {detail(n) && (
                        <span className="text-xs text-muted-foreground">
                          {detail(n)}
                        </span>
                      )}
                      <time
                        dateTime={n.createdAt}
                        className="text-xs text-muted-foreground"
                      >
                        {timeAgo(n.createdAt)}
                      </time>
                    </span>
                  </Link>
                </DropdownMenuItem>
                <div className="flex shrink-0 gap-0.5 pt-1 pr-1 opacity-0 transition-opacity group-hover/row:opacity-100 group-focus-within/row:opacity-100">
                  {n.read ? (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Mark as unread"
                      title="Mark as unread"
                      onClick={() => markUnread(n)}
                    >
                      <Mail />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Mark as read"
                      title="Mark as read"
                      onClick={() => open(n)}
                    >
                      <MailOpen />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Delete notification"
                    title="Delete"
                    onClick={() => remove(n)}
                  >
                    <X />
                  </Button>
                </div>
              </div>
            ))}
            {cursor && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                disabled={pending}
                onClick={loadMore}
              >
                Show older
              </Button>
            )}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Desktop alerts permission: "unsupported" on the server and in browsers
// without the API. Changes come from our own request (the button).
const permissionListeners = new Set<() => void>();

function onPermissionChange(listener: () => void) {
  permissionListeners.add(listener);
  return () => {
    permissionListeners.delete(listener);
  };
}

function permissionChanged() {
  for (const listener of permissionListeners) {
    listener();
  }
}

function readPermission(): NotificationPermission | "unsupported" {
  return "Notification" in window
    ? window.Notification.permission
    : "unsupported";
}

// An OS pop-up while this page is out of sight (another tab or app); on the
// visible page the bell is enough. Every open tab gets the push: with the
// same `tag`, the OS shows one pop-up. `Notification` is our type here, so
// the browser's is window.Notification.
function showDesktop(
  n: Notification,
  navigate: (to: ReturnType<typeof target>) => void,
) {
  if (
    !("Notification" in window) ||
    window.Notification.permission !== "granted" ||
    !document.hidden
  ) {
    return;
  }
  const popup = new window.Notification(describe(n), {
    body: detail(n),
    tag: n.id,
    icon: assetUrl("favicon.ico"),
  });
  popup.onclick = () => {
    window.focus();
    popup.close();
    // The api then pushes notification:read, which updates every tab
    void markNotificationRead(n.id);
    navigate(target(n));
  };
}

// Text is rendered here from type + data, so wording can change later
function describe(n: Notification): string {
  switch (n.type) {
    case "post.published":
      return `${n.actor?.name ?? "Someone"} published “${n.data.title}”`;
    case "test":
      return "Test notification";
    case "order.placed":
      return `${n.actor?.name ?? "Someone"} placed order #${n.data.orderId} (${money(n.data.total, n.data.currency)})`;
    default:
      return "Something happened";
  }
}

// A second line under the title (bell and desktop pop-up), if any
function detail(n: Notification): string | undefined {
  switch (n.type) {
    case "test":
      return "Notifications are working.";
    default:
      return undefined;
  }
}

// Where a notification leads in the panel (Link / navigate props)
function target(n: Notification) {
  switch (n.type) {
    case "post.published":
      return {
        to: "/admin/posts/$id",
        params: {
          id: n.data.postId,
        },
      } as const;
    case "order.placed":
      return {
        to: "/admin/orders/$id",
        params: {
          id: n.data.orderId,
        },
      } as const;
    case "test":
      return {
        to: "/admin/settings",
        hash: "notifications",
      } as const;
  }
}

// Minor units to e.g. "$12.50"; the currency's own decimals
function money(minor: string, currency: string): string {
  const format = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  });
  const digits = format.resolvedOptions().maximumFractionDigits ?? 2;
  return format.format(Number(minor) / 10 ** digits);
}

const relative = new Intl.RelativeTimeFormat(undefined, {
  numeric: "auto",
});

function timeAgo(iso: string): string {
  const seconds = (Date.parse(iso) - Date.now()) / 1000;
  const steps: [
    Intl.RelativeTimeFormatUnit,
    number,
  ][] = [
    [
      "year",
      31536000,
    ],
    [
      "month",
      2592000,
    ],
    [
      "day",
      86400,
    ],
    [
      "hour",
      3600,
    ],
    [
      "minute",
      60,
    ],
  ];
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) {
      return relative.format(Math.round(seconds / size), unit);
    }
  }
  return "just now";
}
