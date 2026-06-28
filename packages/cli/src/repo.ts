import { type Client, ok } from "@atcute/client";
import type { ActorIdentifier } from "@atcute/lexicons";
import { MARGIN_NOTE_COLLECTION, type RepoClient } from "@byjp/book-margin-core";

/** Adapt an authenticated @atcute Client to the core {@link RepoClient} interface. */
export function createRepoClient(rpc: Client, did: ActorIdentifier): RepoClient {
  return {
    async putNote(rkey, record) {
      const result = await ok(
        rpc.post("com.atproto.repo.putRecord", {
          input: {
            repo: did,
            collection: MARGIN_NOTE_COLLECTION,
            rkey,
            record: record as unknown as Record<string, unknown>,
          },
        }),
      );
      return { uri: result.uri };
    },
  };
}
