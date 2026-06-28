import { configure } from "@byjp/book-margin-web";

// Must match the scope requested in @byjp/book-margin-web's oauth client.
const SCOPE = "atproto repo:at.margin.note?action=create&action=update";

const origin = location.origin;
// atproto's development "loopback" client only works on 127.0.0.1 (not localhost).
const isLoopback = location.hostname === "127.0.0.1" || location.hostname === "[::1]";

export const REDIRECT_URI = `${origin}/callback`;

/**
 * In production the client_id is the hosted oauth-client-metadata.json URL. For
 * local development on 127.0.0.1, atproto accepts a special loopback client_id
 * that encodes the redirect_uri and scope inline, with no hosted metadata.
 */
export const CLIENT_ID = isLoopback
  ? `http://localhost?redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPE)}`
  : `${origin}/oauth-client-metadata.json`;

/** localStorage key holding the signed-in DID. */
export const DID_KEY = "book-margin:did";

export function setupOAuth(): void {
  configure({ clientId: CLIENT_ID, redirectUri: REDIRECT_URI });
}
