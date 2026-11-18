// Signed, expiring URLs for private files (ideas/storage "Serving files")
export interface SignedParams {
  user: string;
  expires: string;
  kid: string;
  signature: string;
}

export interface UrlSigner {
  // Path with query, e.g. /assets/104/content?user=..&expires=..&kid=..&signature=..
  sign(assetId: bigint, userId: bigint): string;
  // The user the link was issued to, or null when invalid or expired
  verify(assetId: bigint, params: Partial<SignedParams>): bigint | null;
}

export const URL_SIGNER = Symbol("URL_SIGNER");
