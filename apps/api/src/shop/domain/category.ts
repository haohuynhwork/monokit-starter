import { CategoryCycleError } from "./shop.errors.js";
import { checkName, checkSlug } from "./shop.js";

export interface CategoryProps {
  id: bigint | null;
  parentId: bigint | null;
  name: string;
  slug: string;
  position: number;
  deletedAt: string | null;
}

export class Category {
  private constructor(private props: CategoryProps) {}

  static create(input: {
    name: string;
    slug: string;
    parentId: bigint | null;
    position?: number;
  }): Category {
    return new Category({
      id: null,
      parentId: input.parentId,
      name: checkName(input.name),
      slug: checkSlug(input.slug),
      position: input.position ?? 0,
      deletedAt: null,
    });
  }

  static restore(props: CategoryProps): Category {
    return new Category(props);
  }

  get id(): bigint | null {
    return this.props.id;
  }

  update(input: { name?: string; slug?: string; position?: number }): void {
    if (input.name !== undefined) {
      this.props.name = checkName(input.name);
    }
    if (input.slug !== undefined) {
      this.props.slug = checkSlug(input.slug);
    }
    if (input.position !== undefined) {
      this.props.position = input.position;
    }
  }

  // ancestorsOfParent: the new parent and its ancestors, for the cycle check
  moveTo(parentId: bigint | null, ancestorsOfParent: bigint[]): void {
    if (
      this.props.id !== null &&
      parentId !== null &&
      (parentId === this.props.id || ancestorsOfParent.includes(this.props.id))
    ) {
      throw new CategoryCycleError();
    }
    this.props.parentId = parentId;
  }

  delete(now: Date): void {
    this.props.deletedAt = now.toISOString();
  }

  assignId(id: bigint): void {
    this.props.id = id;
  }

  snapshot(): Readonly<CategoryProps> {
    return this.props;
  }
}
