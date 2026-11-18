import { Query } from "@nestjs/cqrs";

// Does a non-deleted page have this full path (in `localeId`, when given:
// a translation's path, ideas/i18n)? For posts, which share the site's URL
// space (ideas/pages "One URL namespace")
export class IsPagePathTakenQuery extends Query<boolean> {
  constructor(
    readonly path: string,
    readonly localeId?: bigint,
  ) {
    super();
  }
}
