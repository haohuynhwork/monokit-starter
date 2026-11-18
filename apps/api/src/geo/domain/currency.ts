import { BaseCurrencyLockedError, InvalidGeoInputError } from "./geo.errors.js";
import { checkName } from "./geo.js";

export interface CurrencyProps {
  id: bigint | null;
  code: string;
  name: string;
  symbol: string;
  decimals: number;
  // Decimal text: 1 base currency = rate of this one
  rate: string;
  rateAt: string;
  active: boolean;
  position: number;
}

// Up to 10 integer and 10 fraction digits (Numeric(20, 10)), above zero
const RATE = /^\d{1,10}(\.\d{1,10})?$/;

export function checkRate(rate: string): string {
  const r = rate.trim();
  if (!RATE.test(r) || !/[1-9]/.test(r)) {
    throw new InvalidGeoInputError(
      "Rate is a number above 0 with up to 10 decimals, e.g. 25450.5",
    );
  }
  // Canonical form: no leading zeros, no trailing fraction zeros
  const [int, frac = ""] = r.split(".");
  const i = int.replace(/^0+(?=\d)/, "");
  const f = frac.replace(/0+$/, "");
  return f ? `${i}.${f}` : i;
}

function checkCode(code: string): string {
  const c = code.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(c)) {
    throw new InvalidGeoInputError(
      "Currency code is 3 letters (ISO 4217), e.g. VND",
    );
  }
  return c;
}

function checkDecimals(decimals: number): number {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 4) {
    throw new InvalidGeoInputError("Decimals is 0 to 4");
  }
  return decimals;
}

function checkSymbol(symbol: string): string {
  const s = symbol.trim();
  if (s.length > 10) {
    throw new InvalidGeoInputError("Symbol is at most 10 characters");
  }
  return s;
}

// A currency prices can be shown in. Prices are stored in the base currency
// (config shop.currency), whose rate is always 1 and which stays active.
export class Currency {
  private constructor(private props: CurrencyProps) {}

  static create(
    input: {
      code: string;
      name: string;
      symbol?: string;
      decimals?: number;
      rate: string;
      position?: number;
    },
    baseCode: string,
    now: Date,
  ): Currency {
    const code = checkCode(input.code);
    const rate = checkRate(input.rate);
    if (code === baseCode && rate !== "1") {
      throw new BaseCurrencyLockedError("given another rate");
    }
    return new Currency({
      id: null,
      code,
      name: checkName(input.name),
      symbol: checkSymbol(input.symbol ?? ""),
      decimals: checkDecimals(input.decimals ?? 2),
      rate,
      rateAt: now.toISOString(),
      active: true,
      position: input.position ?? 0,
    });
  }

  static restore(props: CurrencyProps): Currency {
    return new Currency(props);
  }

  get id(): bigint | null {
    return this.props.id;
  }

  isBase(baseCode: string): boolean {
    return this.props.code === baseCode;
  }

  // The code is fixed
  update(
    input: {
      name?: string;
      symbol?: string;
      decimals?: number;
      rate?: string;
      active?: boolean;
      position?: number;
    },
    baseCode: string,
    now: Date,
  ): void {
    if (input.name !== undefined) {
      this.props.name = checkName(input.name);
    }
    if (input.symbol !== undefined) {
      this.props.symbol = checkSymbol(input.symbol);
    }
    if (input.decimals !== undefined) {
      this.props.decimals = checkDecimals(input.decimals);
    }
    if (input.position !== undefined) {
      this.props.position = input.position;
    }
    if (input.rate !== undefined) {
      const rate = checkRate(input.rate);
      if (this.isBase(baseCode) && rate !== "1") {
        throw new BaseCurrencyLockedError("given another rate");
      }
      if (rate !== checkRate(this.props.rate)) {
        this.props.rate = rate;
        this.props.rateAt = now.toISOString();
      }
    }
    if (input.active !== undefined) {
      if (!input.active && this.isBase(baseCode)) {
        throw new BaseCurrencyLockedError("deactivated");
      }
      this.props.active = input.active;
    }
  }

  checkDeletable(baseCode: string): void {
    if (this.isBase(baseCode)) {
      throw new BaseCurrencyLockedError("deleted");
    }
  }

  assignId(id: bigint): void {
    this.props.id = id;
  }

  snapshot(): Readonly<CurrencyProps> {
    return this.props;
  }
}
