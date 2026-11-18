import { DomainError } from "../../common/domain/domain-error.js";

export class AssetNotFoundError extends DomainError {
  readonly code = "asset_not_found";
  readonly kind = "not_found";
  constructor() {
    super("File not found");
  }
}

export class UnsupportedFileTypeError extends DomainError {
  readonly code = "unsupported_file_type";
  readonly kind = "invalid";
  constructor(allowed: readonly string[]) {
    super(`File type not allowed; use ${allowed.join(", ")}`);
  }
}

export class FileTooLargeError extends DomainError {
  readonly code = "file_too_large";
  readonly kind = "invalid";
  constructor(maxBytes: number) {
    super(`File is larger than ${Math.floor(maxBytes / 1024 / 1024)} MB`);
  }
}

export class EmptyFileError extends DomainError {
  readonly code = "empty_file";
  readonly kind = "invalid";
  constructor() {
    super("File is empty");
  }
}

export class InvalidNameError extends DomainError {
  readonly code = "invalid_name";
  readonly kind = "invalid";
  constructor() {
    super("Name must be 1 to 255 characters, without control characters");
  }
}

export class InvalidLinkUrlError extends DomainError {
  readonly code = "invalid_link_url";
  readonly kind = "invalid";
  constructor() {
    super("Link must be an absolute http(s) URL");
  }
}

export class NameTakenError extends DomainError {
  readonly code = "name_taken";
  readonly kind = "conflict";
  constructor() {
    super("An item with this name already exists here");
  }
}

export class NotALinkError extends DomainError {
  readonly code = "not_a_link";
  readonly kind = "invalid";
  constructor() {
    super("Only links have a URL to change");
  }
}

export class NotAFolderError extends DomainError {
  readonly code = "not_a_folder";
  readonly kind = "invalid";
  constructor() {
    super("Only folders can contain items");
  }
}

export class MoveIntoItselfError extends DomainError {
  readonly code = "move_into_itself";
  readonly kind = "invalid";
  constructor() {
    super("A folder cannot be moved into itself or its subfolders");
  }
}

export class AssetInUseError extends DomainError {
  readonly code = "asset_in_use";
  readonly kind = "conflict";
  constructor() {
    super("This item, or something inside it, is still in use");
  }
}

export class AssetForbiddenError extends DomainError {
  readonly code = "asset_forbidden";
  readonly kind = "forbidden";
  constructor() {
    super("You can only change items you created");
  }
}

// Backend errors (Storage); not domain rules, so plain Errors
export class StoredObjectNotFoundError extends Error {
  constructor(readonly key: string) {
    super(`Stored object not found: ${key}`);
  }
}

export class StorageBodyLengthError extends Error {
  constructor(
    readonly expected: number,
    readonly received: number,
  ) {
    super(`Body is ${received} bytes, expected ${expected}`);
  }
}

// The range starts past the end of the object
export class StorageRangeError extends Error {
  constructor(readonly size: number) {
    super(`Range not satisfiable (size ${size})`);
  }
}

export class InvalidStorageKeyError extends Error {
  constructor(
    readonly key: string,
    readonly reason: string,
  ) {
    super(`Invalid storage key ${key}: ${reason}`);
  }
}

export class InvalidAssetSlotError extends DomainError {
  readonly code = "invalid_asset_slot";
  readonly kind = "invalid";
  constructor(ownerType: string, slot: string) {
    super(`'${slot}' is not an asset slot of ${ownerType}`);
  }
}

export class AssetAlreadyUsedError extends DomainError {
  readonly code = "asset_already_used";
  readonly kind = "conflict";
  constructor() {
    super("This item is already in that list");
  }
}

// A signed storage link that is missing, altered, expired or used with the
// wrong method
export class StorageSignedUrlError extends Error {
  constructor(readonly reason: "missing" | "invalid" | "expired" | "method") {
    super(`Signed storage link refused: ${reason}`);
  }
}
