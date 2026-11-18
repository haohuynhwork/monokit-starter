import {
  DefaultLocaleLockedError,
  InvalidGeoInputError,
} from "./geo.errors.js";
import { checkName } from "./geo.js";

export interface LocaleProps {
  id: bigint | null;
  code: string;
  name: string;
  nativeName: string;
  rtl: boolean;
  active: boolean;
  isDefault: boolean;
  position: number;
}

// BCP 47, simplified: 'vi-VN', 'en-US', 'zh-Hant', or a bare language 'en'
const CODE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

function checkCode(code: string): string {
  const parts = code.trim().replace(/_/g, "-").split("-");
  // Canonical case: language lower, region upper, script title
  const c = parts
    .map((p, i) =>
      i === 0
        ? p.toLowerCase()
        : p.length === 2
          ? p.toUpperCase()
          : p.length === 4
            ? p[0].toUpperCase() + p.slice(1).toLowerCase()
            : p,
    )
    .join("-");
  if (!CODE.test(c) || c.length > 16) {
    throw new InvalidGeoInputError(
      "Locale code is BCP 47, e.g. vi-VN, en-US or en",
    );
  }
  return c;
}

// A locale of the site: a language plus region conventions. Exactly one is
// the default (the fallback); it must stay active and can't be deleted.
export class Locale {
  private constructor(private props: LocaleProps) {}

  // isDefault: the first locale becomes the default whatever is asked
  static create(input: {
    code: string;
    name: string;
    nativeName?: string;
    rtl?: boolean;
    isDefault: boolean;
    position?: number;
  }): Locale {
    const name = checkName(input.name);
    return new Locale({
      id: null,
      code: checkCode(input.code),
      name,
      nativeName: input.nativeName?.trim() ? checkName(input.nativeName) : name,
      rtl: input.rtl ?? false,
      active: true,
      isDefault: input.isDefault,
      position: input.position ?? 0,
    });
  }

  static restore(props: LocaleProps): Locale {
    return new Locale(props);
  }

  get id(): bigint | null {
    return this.props.id;
  }
  get isDefault(): boolean {
    return this.props.isDefault;
  }

  // The code is fixed. Unsetting the default isn't possible: make another
  // locale the default instead.
  update(input: {
    name?: string;
    nativeName?: string;
    rtl?: boolean;
    active?: boolean;
    isDefault?: boolean;
    position?: number;
  }): void {
    if (input.name !== undefined) {
      this.props.name = checkName(input.name);
    }
    if (input.nativeName !== undefined) {
      this.props.nativeName = checkName(input.nativeName);
    }
    if (input.rtl !== undefined) {
      this.props.rtl = input.rtl;
    }
    if (input.position !== undefined) {
      this.props.position = input.position;
    }
    if (input.isDefault === false && this.props.isDefault) {
      throw new DefaultLocaleLockedError("unset");
    }
    if (input.active === false && (this.props.isDefault || input.isDefault)) {
      throw new DefaultLocaleLockedError("deactivated");
    }
    if (input.active !== undefined) {
      this.props.active = input.active;
    }
    if (input.isDefault) {
      if (!this.props.active) {
        throw new InvalidGeoInputError(
          "Activate the locale before making it the default",
        );
      }
      this.props.isDefault = true;
    }
  }

  checkDeletable(): void {
    if (this.props.isDefault) {
      throw new DefaultLocaleLockedError("deleted");
    }
  }

  assignId(id: bigint): void {
    this.props.id = id;
  }

  snapshot(): Readonly<LocaleProps> {
    return this.props;
  }
}
