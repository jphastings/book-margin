import {
  CompositeDidDocumentResolver,
  CompositeHandleResolver,
  LocalActorResolver,
  PlcDidDocumentResolver,
  WebDidDocumentResolver,
  WellKnownHandleResolver,
} from "@atcute/identity-resolver";
import { NodeDnsHandleResolver } from "@atcute/identity-resolver-node";
import type { ActorIdentifier } from "@atcute/lexicons";

/**
 * Resolve an atproto handle or DID to the URL of the PDS that hosts it, so app
 * password login goes to the right server rather than assuming bsky.social.
 * DIDs are resolved via plc.directory (`did:plc`) or the domain (`did:web`);
 * handles via DNS and the `.well-known` HTTP endpoint.
 */
export async function resolvePdsEndpoint(identifier: string): Promise<string> {
  const resolver = new LocalActorResolver({
    handleResolver: new CompositeHandleResolver({
      strategy: "race",
      methods: { dns: new NodeDnsHandleResolver(), http: new WellKnownHandleResolver() },
    }),
    didDocumentResolver: new CompositeDidDocumentResolver({
      methods: { plc: new PlcDidDocumentResolver(), web: new WebDidDocumentResolver() },
    }),
  });

  const actor = await resolver.resolve(identifier as ActorIdentifier);
  return actor.pds;
}
