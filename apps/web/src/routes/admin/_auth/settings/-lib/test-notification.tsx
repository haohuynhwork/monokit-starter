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
import { BellRing } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { sendTestNotification } from "./actions";

// Longest delay, in seconds
const MAX_DELAY = 3600;
// Most notifications per test (one request each, sent one after another;
// POST /notifications/test isn't rate-limited)
const MAX_COUNT = 200;

// One-click delays; any other can be typed
const PRESETS = [
  0,
  2,
  5,
  10,
  30,
  60,
];

// Not a stored setting: checks notifications end to end (saved, pushed to
// the bell over the socket) without needing a second account. A delay leaves
// time to switch tab or app, to see the desktop alert and the tab badge.
export function TestNotificationCard() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [delay, setDelay] = useState("0");
  const [delayError, setDelayError] = useState<string | null>(null);
  // How many to send, e.g. to see the bell's unread count go up
  const [count, setCount] = useState("1");
  const [countError, setCountError] = useState<string | null>(null);
  // The count checked at start, for the send after a delay
  const sending = useRef(1);
  // Seconds left while counting down; null when not waiting
  const [left, setLeft] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = () => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
    setLeft(null);
  };
  // Leaving the page cancels a pending send
  useEffect(
    () => () => {
      if (timer.current) {
        clearInterval(timer.current);
      }
    },
    [],
  );

  const send = () =>
    startTransition(async () => {
      // Success shows in the bell itself; only a failure is told here.
      // One after another, stopping at the first failure
      for (let i = 0; i < sending.current; i++) {
        const res = await sendTestNotification();
        if (!res.ok) {
          setError(res.message ?? "Couldn't send it.");
          return;
        }
      }
    });

  const start = () => {
    setError(null);
    const seconds = Number(delay.trim() || "0");
    if (!Number.isInteger(seconds) || seconds < 0 || seconds > MAX_DELAY) {
      setDelayError(`Enter whole seconds, 0 to ${MAX_DELAY}.`);
      return;
    }
    setDelayError(null);
    const n = Number(count.trim() || "1");
    if (!Number.isInteger(n) || n < 1 || n > MAX_COUNT) {
      setCountError(`Enter 1 to ${MAX_COUNT}.`);
      return;
    }
    setCountError(null);
    sending.current = n;
    if (seconds === 0) {
      send();
      return;
    }
    // Counted from a deadline: background tabs run timers late
    const due = Date.now() + seconds * 1000;
    setLeft(seconds);
    timer.current = setInterval(() => {
      const rest = Math.ceil((due - Date.now()) / 1000);
      if (rest > 0) {
        setLeft(rest);
        return;
      }
      stop();
      send();
    }, 250);
  };

  return (
    <Card id="notifications" className="scroll-mt-18">
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>
          Send yourself a test. It should appear in the bell right away; if it
          only shows after a reload, the live connection isn&apos;t working. Use
          a delay to switch to another tab or app and check the desktop alert
          and tab badge.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-end gap-2">
          <div className="grid gap-1.5">
            <Label htmlFor="test-notification-count">Count</Label>
            <Input
              id="test-notification-count"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_COUNT}
              className="h-8 w-20"
              value={count}
              disabled={left !== null}
              aria-invalid={countError ? true : undefined}
              onChange={(e) => setCount(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="test-notification-delay">Delay (seconds)</Label>
            <Input
              id="test-notification-delay"
              type="number"
              inputMode="numeric"
              className="h-8 w-28"
              value={delay}
              disabled={left !== null}
              aria-invalid={delayError ? true : undefined}
              onChange={(e) => setDelay(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={pending || left !== null}
            onClick={start}
          >
            <BellRing />
            {left !== null
              ? `Sending in ${left} s…`
              : pending
                ? "Sending…"
                : "Send test notification"}
          </Button>
          {left !== null && (
            <Button variant="ghost" size="sm" onClick={stop}>
              Cancel
            </Button>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {PRESETS.map((s) => (
            <Button
              key={s}
              type="button"
              variant={delay === String(s) ? "secondary" : "ghost"}
              size="xs"
              disabled={left !== null}
              onClick={() => {
                setDelay(String(s));
                setDelayError(null);
              }}
            >
              {s === 0 ? "Now" : `${s} s`}
            </Button>
          ))}
        </div>
        <FieldError>{countError ?? delayError}</FieldError>
        {error && (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
