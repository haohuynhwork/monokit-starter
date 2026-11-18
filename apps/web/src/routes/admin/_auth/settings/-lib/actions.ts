import { api } from "@/lib/api";
import { forgetPublicConfigs } from "@/lib/shop";
import type { ConfigValue } from "@/lib/types";

// Client calls (the web panel's server actions); callers run
// router.invalidate() after a success.

export type SettingState = {
  ok?: boolean;
  message?: string;
  // The api's error code (e.g. 'invalid_config_value'), to place it on a field
  code?: string;
};

// Admin-only; the api checks each value against its key's rules
async function call(
  key: string,
  init: {
    method: "PUT" | "DELETE";
    body?: unknown;
  },
): Promise<SettingState> {
  const res = await api(`/configs/${encodeURIComponent(key)}`, init);
  if (res.status !== "success") {
    return {
      message: res.message ?? "Something went wrong.",
      code: res.code ?? undefined,
    };
  }
  // Public settings (shop currency, shipping countries) load again
  forgetPublicConfigs();
  return {
    ok: true,
  };
}

export async function saveSetting(
  key: string,
  value: ConfigValue,
): Promise<SettingState> {
  return call(key, {
    method: "PUT",
    body: {
      value,
    },
  });
}

export async function resetSetting(key: string): Promise<SettingState> {
  return call(key, {
    method: "DELETE",
  });
}

// Sends through the saved mail setting; `to` empty means the admin's
// address. `sync`: deliver now (errors come back at once) rather than
// through the queue like real mail.
export async function sendTestEmail(
  to: string,
  sync: boolean,
): Promise<
  SettingState & {
    to?: string;
    queued?: boolean;
  }
> {
  const res = await api<{
    to: string;
    queued: boolean;
  }>("/mail/test", {
    method: "POST",
    body: {
      ...(to.trim() && {
        to: to.trim(),
      }),
      sync,
    },
  });
  if (res.status !== "success" || !res.data) {
    const issues = (
      res.data as
        | {
            issues?: {
              message: string;
            }[];
          }
        | undefined
    )?.issues;
    return {
      message: issues?.[0]?.message ?? res.message ?? "Something went wrong.",
      code: res.code ?? undefined,
    };
  }
  return {
    ok: true,
    to: res.data.to,
    queued: res.data.queued,
  };
}

// A 'test' notification to the signed-in admin, through the same storage
// and live push as real ones
export async function sendTestNotification(): Promise<SettingState> {
  const res = await api<{
    id: string;
  }>("/notifications/test", {
    method: "POST",
  });
  if (res.status !== "success") {
    return {
      ok: false,
      message: res.message ?? "Couldn't send it.",
    };
  }
  return {
    ok: true,
  };
}
