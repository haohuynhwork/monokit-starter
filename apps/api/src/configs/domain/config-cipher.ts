// Encrypts the values of keys with secret fields (config-keys `secret`).
// Sealed values name the key that sealed them, so old values stay readable
// while the secret is rotated (see infrastructure/aes-config-cipher.ts).
export interface ConfigCipher {
  // false when the server has no APP_SECRET
  readonly available: boolean;
  // `key` is bound to the ciphertext: a value can't be moved to another key
  seal(key: string, value: unknown): string;
  open(key: string, sealed: string): unknown;
  // Sealed with an older secret, so worth sealing again
  isStale(sealed: string): boolean;
}

export const CONFIG_CIPHER = Symbol("CONFIG_CIPHER");
