import { COUNTRIES, countryName } from "@packages/geo";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@packages/ui/components/accordion";
import { Badge } from "@packages/ui/components/badge";
import { Button } from "@packages/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@packages/ui/components/card";
import { FieldError } from "@packages/ui/components/field";
import { Input } from "@packages/ui/components/input";
import { Label } from "@packages/ui/components/label";
import { useRouter } from "@tanstack/react-router";
import { useMemo, useState, useTransition } from "react";
import { notify } from "@/components/toast";
import type {
  ConfigEntry,
  ConfigValue,
  MailDriver,
  MailSettings,
} from "@/lib/types";
import {
  resetSetting,
  type SettingState,
  saveSetting,
  sendTestEmail,
} from "./actions";
import { TestNotificationCard } from "./test-notification";
import { TestToastCard } from "./test-toast";

// Settings grouped by key prefix into always-open cards, with a sticky nav
const SECTIONS: {
  id: string;
  title: string;
  description: string;
  prefixes: string[];
}[] = [
  {
    id: "site",
    title: "Site",
    description: "Name and description shown on the website.",
    prefixes: [
      "site.",
    ],
  },
  {
    id: "store",
    title: "Store",
    description: "Currency, tax and orders.",
    prefixes: [
      "shop.",
      "orders.",
    ],
  },
  {
    id: "shipping",
    title: "Shipping",
    description: "Fees and where you ship to.",
    prefixes: [
      "shipping.",
    ],
  },
  {
    id: "email",
    title: "Email",
    description: "How outgoing email is sent.",
    prefixes: [
      "mail",
    ],
  },
];

const sectionOf = (key: string) =>
  SECTIONS.find((s) => s.prefixes.some((p) => key.startsWith(p)))?.id ??
  "other";

export function SettingsForm({ entries }: { entries: ConfigEntry[] }) {
  const sections = [
    ...SECTIONS,
    {
      id: "other",
      title: "Other",
      description: "",
      prefixes: [],
    },
  ]
    .map((s) => ({
      ...s,
      entries: entries.filter((e) => sectionOf(e.key) === s.id),
    }))
    .filter((s) => s.entries.length > 0);

  return (
    <div className="grid gap-6 md:grid-cols-[10rem_1fr]">
      <nav className="hidden md:block">
        {/* Below the panel's sticky header (h-14) */}
        <ul className="sticky top-18 flex flex-col gap-1 text-sm">
          {sections.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="block rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {s.title}
              </a>
            </li>
          ))}
          <li>
            <a
              href="#notifications"
              className="block rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Notifications
            </a>
          </li>
          <li>
            <a
              href="#toasts"
              className="block rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Toasts
            </a>
          </li>
        </ul>
      </nav>
      <div className="flex min-w-0 flex-col gap-6">
        {sections.map((s) => (
          <Card key={s.id} id={s.id} className="scroll-mt-18">
            <CardHeader>
              <CardTitle>{s.title}</CardTitle>
              {s.description && (
                <CardDescription>{s.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="flex flex-col divide-y px-0">
              {s.entries.map((entry) =>
                entry.key === "shipping.countries" ? (
                  <CountriesRow key={entry.key} entry={entry} />
                ) : entry.key === "mail" ? (
                  <MailRow key={entry.key} entry={entry} />
                ) : (
                  <SettingRow key={entry.key} entry={entry} />
                ),
              )}
            </CardContent>
          </Card>
        ))}
        <TestNotificationCard />
        <TestToastCard />
      </div>
    </div>
  );
}

// Numbers are whole; an empty number field means null where the default is
// null (e.g. "no free shipping")
function parse(entry: ConfigEntry, raw: string): ConfigValue {
  if (typeof entry.default === "string") {
    return raw;
  }
  if (raw.trim() === "") {
    return entry.default === null ? null : Number.NaN;
  }
  return Number(raw);
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Checked before saving; the api checks the rest of the key's rules
function checkValue(entry: ConfigEntry, value: ConfigValue): string | null {
  if (typeof value === "number" && !Number.isInteger(value)) {
    return "Enter a whole number.";
  }
  if (typeof value === "string") {
    if (entry.key === "site.name" && value.trim() === "") {
      return "Enter a site name.";
    }
    if (value.trim().length > 1000) {
      return "Use at most 1000 characters.";
    }
  }
  return null;
}

// "Invalid value for "mail": fromEmail must be ..." -> the mail field it names
const MAIL_FIELDS = [
  "host",
  "port",
  "username",
  "password",
  "apiKey",
  "fromName",
  "fromEmail",
] as const;
function mailFieldOf(res: SettingState): string | null {
  if (res.code !== "invalid_config_value") {
    return null;
  }
  const m = /: (\w+) /.exec(res.message ?? "");
  return m && (MAIL_FIELDS as readonly string[]).includes(m[1]) ? m[1] : null;
}

// Save and reset with toasts, shared by the rows
function useSetting(entry: ConfigEntry) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // onFail returns true when it showed the error on a field (no toast)
  const save = (
    value: ConfigValue,
    onDone?: () => void,
    onFail?: (res: SettingState) => boolean,
  ) =>
    startTransition(async () => {
      const res = await saveSetting(entry.key, value);
      if (res.ok) {
        // Re-runs the route loader (isSet, updatedAt)
        await router.invalidate();
        onDone?.();
      } else if (onFail?.(res)) {
        return;
      }
      notify(res.ok ? `${entry.label} saved` : `Couldn't save ${entry.label}`, {
        kind: res.ok ? "success" : "error",
        description: res.ok ? undefined : res.message,
      });
    });
  const reset = (onDone?: () => void) =>
    startTransition(async () => {
      const res = await resetSetting(entry.key);
      if (res.ok) {
        // Re-runs the route loader (isSet, updatedAt)
        await router.invalidate();
        onDone?.();
      }
      notify(
        res.ok
          ? `${entry.label} back to default`
          : `Couldn't reset ${entry.label}`,
        {
          kind: res.ok ? "success" : "error",
          description: res.ok ? undefined : res.message,
        },
      );
    });
  return {
    pending,
    save,
    reset,
  };
}

// 'shipping.countries': a searchable checklist; Reset (null) ships anywhere
function CountriesRow({ entry }: { entry: ConfigEntry }) {
  const saved = useMemo(
    () => (Array.isArray(entry.value) ? entry.value : []),
    [
      entry.value,
    ],
  );
  const [picked, setPicked] = useState<Set<string>>(new Set(saved));
  const [query, setQuery] = useState("");
  const { pending, save, reset } = useSetting(entry);
  const all = useMemo(
    () =>
      COUNTRIES.map((code) => ({
        code,
        name: countryName(code),
      })).sort((a, b) => a.name.localeCompare(b.name)),
    [],
  );
  const q = query.trim().toLowerCase();
  const shown = q
    ? all.filter(
        (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase() === q,
      )
    : all;
  const dirty =
    picked.size !== saved.length || saved.some((c) => !picked.has(c));
  const toggle = (code: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });

  return (
    <div className="flex flex-col gap-2 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor="cfg-countries-search">{entry.label}</Label>
        <code className="text-xs text-muted-foreground">{entry.key}</code>
        {!entry.isSet && <Badge variant="secondary">Default</Badge>}
      </div>
      <p className="text-sm text-muted-foreground">
        {entry.isSet
          ? `Ships to ${saved.length} ${saved.length === 1 ? "country" : "countries"}: ${saved.map((c) => countryName(c)).join(", ")}`
          : "Ships anywhere. Pick countries to limit where addresses and orders are accepted."}
      </p>
      <Accordion type="single" collapsible>
        <AccordionItem value="countries" className="rounded-md border px-3">
          <AccordionTrigger>
            {picked.size > 0
              ? `${picked.size} selected${dirty ? " (unsaved)" : ""}`
              : "Choose countries"}
          </AccordionTrigger>
          <AccordionContent className="flex flex-col gap-2">
            <Input
              id="cfg-countries-search"
              type="search"
              placeholder="Search countries…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <ul className="grid max-h-56 gap-x-4 overflow-y-auto rounded-md border p-2 sm:grid-cols-2">
              {shown.map((c) => (
                <li key={c.code}>
                  <label className="flex items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-muted">
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={picked.has(c.code)}
                      onChange={() => toggle(c.code)}
                    />
                    <span className="truncate">{c.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {c.code}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={pending || !dirty || picked.size === 0}
          onClick={() =>
            save(
              [
                ...picked,
              ].sort(),
            )
          }
        >
          Save {picked.size > 0 && `(${picked.size})`}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending || !entry.isSet}
          onClick={() => reset(() => setPicked(new Set()))}
        >
          Ship anywhere
        </Button>
      </div>
    </div>
  );
}

function SettingRow({ entry }: { entry: ConfigEntry }) {
  const [raw, setRaw] = useState(
    entry.value === null ? "" : String(entry.value),
  );
  const { pending, save: saveValue, reset: resetValue } = useSetting(entry);
  const numeric = typeof entry.default !== "string";
  const id = `cfg-${entry.key}`;
  const [error, setError] = useState<string | null>(null);
  const dirty = raw !== (entry.value === null ? "" : String(entry.value));
  const save = () => {
    const value = parse(entry, raw);
    const invalid = checkValue(entry, value);
    setError(invalid);
    if (invalid) {
      return;
    }
    saveValue(value, undefined, (res) => {
      if (res.code !== "invalid_config_value") {
        return false;
      }
      setError(res.message ?? "Invalid value.");
      return true;
    });
  };
  const reset = () =>
    resetValue(() => {
      setError(null);
      setRaw(entry.default === null ? "" : String(entry.default));
    });

  return (
    <form
      noValidate
      className="flex flex-col gap-2 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor={id}>{entry.label}</Label>
        <code className="text-xs text-muted-foreground">{entry.key}</code>
        {!entry.public && <Badge variant="outline">Private</Badge>}
        {!entry.isSet && <Badge variant="secondary">Default</Badge>}
      </div>
      <div className="flex gap-2">
        <Input
          id={id}
          type={numeric ? "number" : "text"}
          step={numeric ? 1 : undefined}
          value={raw}
          placeholder={
            entry.default === null ? "Not set" : String(entry.default)
          }
          aria-invalid={!!error || undefined}
          onChange={(e) => setRaw(e.target.value)}
        />
        <Button type="submit" size="sm" disabled={pending || !dirty}>
          Save
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending || !entry.isSet}
          onClick={reset}
        >
          Reset
        </Button>
      </div>
      <FieldError>{error}</FieldError>
      <p className="text-xs text-muted-foreground">
        Default: {entry.default === null ? "not set" : String(entry.default)}
        {entry.updatedAt &&
          ` · changed ${new Date(entry.updatedAt).toLocaleString()}`}
      </p>
    </form>
  );
}

const DRIVERS: {
  value: MailDriver;
  label: string;
  hint: string;
}[] = [
  {
    value: "smtp",
    label: "SMTP",
    hint: "Any provider's SMTP server (Gmail, SES, Mailgun, Postmark…).",
  },
  {
    value: "resend",
    label: "Resend",
    hint: "resend.com over HTTPS; works where SMTP ports are blocked.",
  },
  {
    value: "log",
    label: "Log only",
    hint: "Nothing is sent; each email is written to the api log.",
  },
];

// Every driver's fields at once, so switching type keeps what was typed
type MailForm = {
  driver: MailDriver;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  apiKey: string;
  fromName: string;
  fromEmail: string;
};

const EMPTY_MAIL: MailForm = {
  driver: "smtp",
  host: "",
  port: 587,
  secure: false,
  username: "",
  password: "",
  apiKey: "",
  fromName: "",
  fromEmail: "",
};

const toForm = (v: MailSettings | null): MailForm => ({
  ...EMPTY_MAIL,
  ...v,
});

// Only the chosen driver's fields; the api checks them
function toSettings(f: MailForm): MailSettings {
  const from = {
    fromName: f.fromName,
    fromEmail: f.fromEmail,
  };
  switch (f.driver) {
    case "smtp":
      return {
        driver: "smtp",
        host: f.host,
        port: f.port,
        secure: f.secure,
        username: f.username,
        password: f.password,
        ...from,
      };
    case "resend":
      return {
        driver: "resend",
        apiKey: f.apiKey,
        ...from,
      };
    case "log":
      return {
        driver: "log",
        ...from,
      };
  }
}

// 'mail': one record saved at once. Secrets never come back from the api;
// leaving one empty keeps the saved value (same type only). Reset turns
// email off.
function MailRow({ entry }: { entry: ConfigEntry }) {
  const savedValue = entry.value as MailSettings | null;
  const saved = toForm(savedValue);
  const [form, setForm] = useState<MailForm>(saved);
  const [testTo, setTestTo] = useState("");
  // Off: delivered now, so a wrong setting fails here; on: tests the queue
  const [viaQueue, setViaQueue] = useState(false);
  const [testing, startTest] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [testError, setTestError] = useState<string | null>(null);
  const { pending, save, reset } = useSetting(entry);
  const sameDriver = savedValue?.driver === form.driver;
  const has = (secret: string) =>
    sameDriver && entry.secretsSet.includes(secret);
  const set = <K extends keyof MailForm>(k: K, v: MailForm[K]) =>
    setForm((f) => ({
      ...f,
      [k]: v,
    }));
  const dirty = (Object.keys(form) as (keyof MailForm)[]).some(
    (k) => form[k] !== saved[k],
  );
  const test = () => {
    const to = testTo.trim();
    if (to.length > 255) {
      setTestError("Use at most 255 characters.");
      return;
    }
    if (to && !EMAIL.test(to)) {
      setTestError("Enter an email address.");
      return;
    }
    setTestError(null);
    startTest(async () => {
      const res = await sendTestEmail(testTo, !viaQueue);
      if (!res.ok && res.code === "validation_failed") {
        setTestError(res.message ?? "Invalid address.");
        return;
      }
      notify(
        !res.ok
          ? "Test email failed"
          : res.queued
            ? `Test email queued for ${res.to}`
            : `Test email sent to ${res.to}`,
        {
          kind: res.ok ? "success" : "error",
          description: !res.ok
            ? res.message
            : res.queued
              ? "Check the inbox. If it doesn't arrive, delivery errors are in the api log (retried for about 30 minutes)."
              : viaQueue
                ? "No queue is set up (VALKEY_URL), so it was sent right away."
                : undefined,
        },
      );
    });
  };
  // Pre-checks the fields the api requires for the chosen driver
  const check = (f: MailForm): Record<string, string> => {
    const e: Record<string, string> = {};
    if (f.driver === "smtp") {
      if (!f.host.trim()) {
        e.host = "Enter the server.";
      } else if (f.host.trim().length > 255) {
        e.host = "Use at most 255 characters.";
      }
      if (!Number.isInteger(f.port) || f.port < 1 || f.port > 65535) {
        e.port = "Enter a port from 1 to 65535.";
      }
      if (f.username.trim().length > 255) {
        e.username = "Use at most 255 characters.";
      } else if (f.password && !f.username.trim()) {
        e.username = "Enter a username to go with the password.";
      }
    }
    if (f.fromName.trim().length > 100) {
      e.fromName = "Use at most 100 characters.";
    }
    if (!f.fromEmail.trim()) {
      e.fromEmail = "Enter the from address.";
    } else if (f.fromEmail.trim().length > 255) {
      e.fromEmail = "Use at most 255 characters.";
    } else if (!EMAIL.test(f.fromEmail.trim())) {
      e.fromEmail = "Enter an email address.";
    }
    return e;
  };
  const field = (
    k: "host" | "username" | "fromName" | "fromEmail",
    label: string,
    props: React.ComponentProps<typeof Input> = {},
  ) => (
    <div className="flex flex-col gap-1">
      <Label htmlFor={`mail-${k}`}>{label}</Label>
      <Input
        id={`mail-${k}`}
        value={form[k]}
        aria-invalid={!!errors[k] || undefined}
        onChange={(e) => set(k, e.target.value)}
        {...props}
      />
      <FieldError>{errors[k]}</FieldError>
    </div>
  );
  const secret = (k: "password" | "apiKey", label: string) => (
    <div className="flex flex-col gap-1">
      <Label htmlFor={`mail-${k}`}>{label}</Label>
      <Input
        id={`mail-${k}`}
        type="password"
        autoComplete="new-password"
        value={form[k]}
        placeholder={has(k) ? "Saved; type to replace" : ""}
        aria-invalid={!!errors[k] || undefined}
        onChange={(e) => set(k, e.target.value)}
      />
      <FieldError>{errors[k]}</FieldError>
    </div>
  );
  const hint = DRIVERS.find((d) => d.value === form.driver)?.hint;

  return (
    <form
      noValidate
      className="flex flex-col gap-3 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        const invalid = check(form);
        setErrors(invalid);
        if (Object.keys(invalid).length > 0) {
          return;
        }
        save(
          toSettings(form),
          () =>
            setForm((f) => ({
              ...f,
              password: "",
              apiKey: "",
            })),
          (res) => {
            const name = mailFieldOf(res);
            if (!name) {
              return false;
            }
            setErrors({
              [name]: res.message ?? "Invalid value.",
            });
            return true;
          },
        );
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{entry.label}</span>
        <code className="text-xs text-muted-foreground">{entry.key}</code>
        <Badge variant="outline">Private</Badge>
        <Badge variant="outline">Encrypted</Badge>
        {!entry.isSet && <Badge variant="secondary">Off</Badge>}
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="mail-driver">Send with</Label>
        <select
          id="mail-driver"
          value={form.driver}
          onChange={(e) => set("driver", e.target.value as MailDriver)}
          className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
        >
          {DRIVERS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>

      {form.driver === "smtp" && (
        <>
          {field("host", "Server", {
            placeholder: "smtp.example.com",
          })}
          <div className="grid gap-3 sm:grid-cols-2">
            {field("username", "Username", {
              autoComplete: "off",
            })}
            {secret("password", "Password")}
          </div>
          <Accordion type="single" collapsible>
            <AccordionItem value="advanced" className="rounded-md border px-3">
              <AccordionTrigger>
                {`Advanced · port ${form.port}, ${form.secure ? "TLS" : "STARTTLS"}`}
              </AccordionTrigger>
              <AccordionContent className="flex flex-col gap-3">
                <div className="flex max-w-28 flex-col gap-1">
                  <Label htmlFor="mail-port">Port</Label>
                  <Input
                    id="mail-port"
                    type="number"
                    value={form.port}
                    aria-invalid={!!errors.port || undefined}
                    onChange={(e) => set("port", Number(e.target.value))}
                  />
                  <FieldError>{errors.port}</FieldError>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={form.secure}
                    onChange={(e) => set("secure", e.target.checked)}
                  />
                  TLS from the start (usually port 465); off uses STARTTLS (587)
                </label>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </>
      )}
      {form.driver === "resend" && secret("apiKey", "API key")}

      <div className="grid gap-3 sm:grid-cols-2">
        {field("fromName", "From name", {
          placeholder: "Monokit",
        })}
        {field("fromEmail", "From address", {
          type: "email",
          placeholder: "no-reply@example.com",
        })}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending || !entry.isSet}
          onClick={() =>
            reset(() => {
              setErrors({});
              setForm(EMPTY_MAIL);
            })
          }
        >
          Turn email off
        </Button>
        <Button type="submit" size="sm" disabled={pending || !dirty}>
          Save
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t pt-3">
        <Input
          type="email"
          aria-label="Send test to"
          placeholder="Test to (empty: your address)"
          value={testTo}
          aria-invalid={!!testError || undefined}
          onChange={(e) => setTestTo(e.target.value)}
          className="max-w-64"
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={viaQueue}
            onChange={(e) => setViaQueue(e.target.checked)}
          />
          Through the queue
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={testing || !entry.isSet || dirty}
          onClick={test}
        >
          {testing ? "Sending…" : "Send test email"}
        </Button>
        {dirty && entry.isSet && (
          <span className="text-xs text-muted-foreground">
            Save first to test the new values.
          </span>
        )}
      </div>
      <FieldError>{testError}</FieldError>
      {entry.updatedAt && (
        <p className="text-xs text-muted-foreground">
          Changed {new Date(entry.updatedAt).toLocaleString()}
        </p>
      )}
    </form>
  );
}
