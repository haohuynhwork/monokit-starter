import { Query } from "@nestjs/cqrs";

export interface ConfigView {
  key: string;
  label: string;
  // Secret fields are blank; `secretsSet` names those holding a value
  value: unknown;
  secretsSet: string[];
  default: unknown;
  // false: no row, value is the default
  isSet: boolean;
  public: boolean;
  updatedAt: string | null;
}

// Every known key, for the admin settings page
export class ListConfigsQuery extends Query<ConfigView[]> {}
