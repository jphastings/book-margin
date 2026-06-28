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

// `transition:generic` grants the broad repo read/write access this tool needs.
const SCOPE = "atproto transition:generic";

export interface OAuthConfig {
  /** The URL where this app's client metadata is hosted (the OAuth client_id). */
  clientId: string;
  /** Where the authorization server redirects back to. */
  redirectUri: string;
}

export interface Authed {
  agent: OAuthUserAgent;
  did: string;
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
  const agent = new OAuthUserAgent(session);
  return { agent, did: agent.sub };
}

/** Restore a previously stored session by DID, or undefined if none/expired. */
export async function restoreSession(did: string): Promise<Authed | undefined> {
  try {
    const session = await getSession(did as Did, { allowStale: true });
    const agent = new OAuthUserAgent(session);
    return { agent, did: agent.sub };
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
