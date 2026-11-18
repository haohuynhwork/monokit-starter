import { Query } from "@nestjs/cqrs";

// Does a non-deleted post have this full path? For pages, which share the
// site's URL space (ideas/pages "One URL namespace")
export class IsPostPathTakenQuery extends Query<boolean> {
  constructor(readonly path: string) {
    super();
  }
}
