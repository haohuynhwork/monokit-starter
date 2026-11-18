import { Query } from "@nestjs/cqrs";

// Public keys only, defaults filled in
export class GetPublicConfigsQuery extends Query<Record<string, unknown>> {}
