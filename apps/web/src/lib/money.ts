// Money travels as minor units (cents) in a string. Digits per currency
// come from Intl, e.g. USD 2, VND 0.
export function currencyDigits(currency: string): number {
  try {
    return (
      new Intl.NumberFormat("en", {
        style: "currency",
        currency,
      }).resolvedOptions().maximumFractionDigits ?? 2
    );
  } catch {
    return 2;
  }
}

export function formatMoney(minor: string | number, currency: string): string {
  const digits = currencyDigits(currency);
  const value = Number(minor) / 10 ** digits;
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
    }).format(value);
  } catch {
    return `${value.toFixed(digits)} ${currency}`;
  }
}

// "19.99" -> "1999"; null when not a valid amount
export function toMinor(input: string, currency: string): string | null {
  const digits = currencyDigits(currency);
  const m = input
    .trim()
    .replace(/,/g, "")
    .match(/^(\d+)(?:\.(\d*))?$/);
  if (!m || (m[2] && m[2].length > digits)) {
    return null;
  }
  const frac = (m[2] ?? "").padEnd(digits, "0");
  return String(BigInt(m[1] + frac));
}

// "1999" -> "19.99", for inputs
export function fromMinor(minor: string, currency: string): string {
  const digits = currencyDigits(currency);
  if (digits === 0) {
    return minor;
  }
  const s = minor.padStart(digits + 1, "0");
  return `${s.slice(0, -digits)}.${s.slice(-digits)}`;
}
