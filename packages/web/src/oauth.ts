import { Client, ok } from "@atcute/client";
import {
  CompositeDidDocumentResolver,
  LocalActorResolver,
  PlcDidDocumentResolver,
  WebDidDocumentResolver,
  XrpcHandleResolver,
} from "@atcute/identity-resolver";
import type { ActorIdentifier, Did } from "@atcute/lexicons";
import {
  configureOAuth,
  createAuthorizationUrl,
  deleteStoredSession,
  finalizeAuthorization,
  getSession,
  OAuthUserAgent,
} from "@atcute/oauth-browser-client";

// Request only what this tool needs: creating and updating `at.margin.note`
// records. (`atproto` is the required base scope; reads use public endpoints.)
const SCOPE = "atproto repo:at.margin.note?action=create&action=update";

export interface OAuthConfig {
  /** The URL where this app's client metadata is hosted (the OAuth client_id). */
  clientId: string;
  /** Where the authorization server redirects back to. */
  redirectUri: string;
}

export interface Authed {
  agent: OAuthUserAgent;
  did: string;
  /** The account's handle (falls back to the DID if it can't be resolved). */
  handle: string;
}

async function toAuthed(agent: OAuthUserAgent): Promise<Authed> {
  let handle: string = agent.sub;
  try {
    const rpc = new Client({ handler: agent });
    const session = await ok(rpc.get("com.atproto.server.getSession"));
    handle = session.handle;
  } catch {
    // Keep the DID as a fallback handle.
  }
  return { agent, did: agent.sub, handle };
}

/** Configure the OAuth client. Call once before any other function here. */
export function configure(config: OAuthConfig): void {
  configureOAuth({
    metadata: { client_id: config.clientId, redirect_uri: config.redirectUri },
    identityResolver: new LocalActorResolver({
      // Browsers can't do raw DNS, so resolve handles via an AppView.
      handleResolver: new XrpcHandleResolver({ serviceUrl: "https://public.api.bsky.app" }),
      didDocumentResolver: new CompositeDidDocumentResolver({
        methods: { plc: new PlcDidDocumentResolver(), web: new WebDidDocumentResolver() },
      }),
    }),
  });
}

/** Start the login redirect for a handle or DID. */
export async function beginLogin(identifier: string): Promise<void> {
  const url = await createAuthorizationUrl({
    target: { type: "account", identifier: identifier as ActorIdentifier },
    scope: SCOPE,
  });
  // Let the browser persist PKCE/DPoP state before navigating away.
  await new Promise((resolve) => setTimeout(resolve, 200));
  window.location.assign(url.href);
}

/** Finish login on the redirect page, returning an authenticated agent. */
export async function completeCallback(): Promise<Authed> {
  const params = new URLSearchParams(window.location.hash.slice(1));
  history.replaceState(null, "", window.location.pathname + window.location.search);
  const { session } = await finalizeAuthorization(params);
  return toAuthed(new OAuthUserAgent(session));
}

/** Restore a previously stored session by DID, or undefined if none/expired. */
export async function restoreSession(did: string): Promise<Authed | undefined> {
  try {
    const session = await getSession(did as Did, { allowStale: true });
    return toAuthed(new OAuthUserAgent(session));
  } catch {
    return undefined;
  }
}

export async function signOut(did: string): Promise<void> {
  try {
    const session = await getSession(did as Did, { allowStale: true });
    await new OAuthUserAgent(session).signOut();
  } catch {
    deleteStoredSession(did as Did);
  }
}
