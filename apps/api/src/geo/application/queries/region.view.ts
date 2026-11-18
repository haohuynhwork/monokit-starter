// Response shape; ids are strings (BigInt has no JSON form)

export interface RegionView {
  id: string;
  countryCode: string;
  parentId: string | null;
  code: string;
  name: string;
  position: number;
  active: boolean;
}

export function toRegionView(r: {
  id: bigint;
  countryCode: string;
  parentId: bigint | null;
  code: string;
  name: string;
  position: number;
  active: boolean;
}): RegionView {
  return {
    ...r,
    id: String(r.id),
    parentId: r.parentId === null ? null : String(r.parentId),
  };
}
