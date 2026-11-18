import { DomainError } from "../../common/domain/domain-error.js";

export class PageNotFoundError extends DomainError {
  readonly code = "page_not_found";
  readonly kind = "not_found";
  constructor() {
    super("Page not found");
  }
}

export class InvalidPageError extends DomainError {
  readonly code = "invalid_page";
  readonly kind = "invalid";
}

export class PageNotReachableError extends DomainError {
  readonly code = "page_not_reachable";
  readonly kind = "invalid";
  constructor() {
    super("Give the page (and every parent) a slug before publishing");
  }
}

export class LivePageNeedsSlugError extends DomainError {
  readonly code = "live_page_needs_slug";
  readonly kind = "conflict";
  constructor() {
    super("A published or scheduled page must keep a slug; unpublish it first");
  }
}

export class LiveDescendantPageNeedsPathError extends DomainError {
  readonly code = "live_descendant_needs_path";
  readonly kind = "conflict";
  constructor() {
    super(
      "A published page below this one would lose its URL; unpublish it first",
    );
  }
}

export class PrivateFilesInPageError extends DomainError {
  readonly code = "private_files_in_page";
  readonly kind = "conflict";
  constructor() {
    super("Make the page’s files public before publishing it");
  }
}

export class UnknownFilesInPageError extends DomainError {
  readonly code = "unknown_files_in_page";
  readonly kind = "invalid";
  constructor() {
    super("Use public files from the media library only");
  }
}

export class PageHasChildrenError extends DomainError {
  readonly code = "page_has_children";
  readonly kind = "conflict";
  constructor() {
    super("Move or delete the pages under it first");
  }
}

export class MovePageIntoItselfError extends DomainError {
  readonly code = "move_page_into_itself";
  readonly kind = "invalid";
  constructor() {
    super("A page cannot be moved under itself or its children");
  }
}

export class PageLayoutNotFoundError extends DomainError {
  readonly code = "page_layout_not_found";
  readonly kind = "not_found";
  constructor() {
    super("Layout not found");
  }
}

export class InvalidPageLayoutError extends DomainError {
  readonly code = "invalid_page_layout";
  readonly kind = "invalid";
}

export class PageLayoutNameTakenError extends DomainError {
  readonly code = "page_layout_name_taken";
  readonly kind = "conflict";
  constructor() {
    super("Another layout already has this name");
  }
}

export class LayoutInUseError extends DomainError {
  readonly code = "layout_in_use";
  readonly kind = "conflict";
  constructor() {
    super("Pages use this layout; move them to another layout first");
  }
}

export class LayoutIsDefaultError extends DomainError {
  readonly code = "layout_is_default";
  readonly kind = "conflict";
  constructor() {
    super("Make another layout the default before deleting this one");
  }
}

export class SidebarNeedsTemplateError extends DomainError {
  readonly code = "sidebar_needs_template";
  readonly kind = "invalid";
  constructor() {
    super('A sidebar needs the "sidebar" template');
  }
}

export class ContactFormNotFoundError extends DomainError {
  readonly code = "contact_form_not_found";
  readonly kind = "not_found";
  constructor() {
    super("Contact form not found");
  }
}

export class InvalidContactMessageError extends DomainError {
  readonly code = "invalid_contact_message";
  readonly kind = "invalid";
}
