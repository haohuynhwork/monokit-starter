import { InvalidGeoInputError, RegionCycleError } from "./geo.errors.js";
import { checkName } from "./geo.js";

export interface RegionProps {
  id: bigint | null;
  countryCode: string;
  parentId: bigint | null;
  code: string;
  name: string;
  position: number;
  active: boolean;
}

// 'VN-HN', 'VN-HN-01': the country, a dash, then letters, digits and dashes
const CODE = /^[A-Z]{2}-[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

export function checkRegionCode(code: string, countryCode: string): string {
  const c = code.trim().toUpperCase();
  if (!CODE.test(c) || c.length > 20) {
    throw new InvalidGeoInputError(
      "Region codes look like VN-HN (max 20 characters)",
    );
  }
  if (!c.startsWith(`${countryCode}-`)) {
    throw new InvalidGeoInputError(
      `Region codes of ${countryCode} start with ${countryCode}-`,
    );
  }
  return c;
}

// An entry of the address pick list (ideas/orders/address.md). The code is
// fixed once created: addresses store it. Retire with active = false.
export class Region {
  private constructor(private props: RegionProps) {}

  // parent: the parent region's country, checked against countryCode
  static create(input: {
    countryCode: string;
    code: string;
    name: string;
    parent: {
      id: bigint;
      countryCode: string;
    } | null;
    position?: number;
  }): Region {
    const countryCode = input.countryCode.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(countryCode)) {
      throw new InvalidGeoInputError("Country is a 2-letter code, e.g. VN");
    }
    if (input.parent && input.parent.countryCode !== countryCode) {
      throw new InvalidGeoInputError("The parent region is in another country");
    }
    return new Region({
      id: null,
      countryCode,
      parentId: input.parent?.id ?? null,
      code: checkRegionCode(input.code, countryCode),
      name: checkName(input.name),
      position: input.position ?? 0,
      active: true,
    });
  }

  static restore(props: RegionProps): Region {
    return new Region(props);
  }

  get id(): bigint | null {
    return this.props.id;
  }
  get countryCode(): string {
    return this.props.countryCode;
  }

  update(input: { name?: string; position?: number; active?: boolean }): void {
    if (input.name !== undefined) {
      this.props.name = checkName(input.name);
    }
    if (input.position !== undefined) {
      this.props.position = input.position;
    }
    if (input.active !== undefined) {
      this.props.active = input.active;
    }
  }

  // ancestorsOfParent: the new parent and its ancestors, for the cycle check
  moveTo(
    parent: {
      id: bigint;
      countryCode: string;
    } | null,
    ancestorsOfParent: bigint[],
  ): void {
    if (parent && parent.countryCode !== this.props.countryCode) {
      throw new InvalidGeoInputError("The parent region is in another country");
    }
    if (
      this.props.id !== null &&
      parent !== null &&
      (parent.id === this.props.id || ancestorsOfParent.includes(this.props.id))
    ) {
      throw new RegionCycleError();
    }
    this.props.parentId = parent?.id ?? null;
  }

  assignId(id: bigint): void {
    this.props.id = id;
  }

  snapshot(): Readonly<RegionProps> {
    return this.props;
  }
}
