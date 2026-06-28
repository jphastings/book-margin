import { Client, ok } from "@atcute/client";
import type { ActorIdentifier } from "@atcute/lexicons";
import type { OAuthUserAgent } from "@atcute/oauth-browser-client";
import { MARGIN_NOTE_COLLECTION, type MarginNote, type RepoClient } from "@byjp/book-margin-core";

/**
 * Every `at.margin.note` already in the user's repo, keyed by rkey, so the review
 * UI can tell unchanged records (already saved) from ones that need writing or
 * updating. (The sync itself never needs this — deterministic rkeys make writes
 * idempotent.)
 */
export async function listExistingNotes(agent: OAuthUserAgent): Promise<Map<string, MarginNote>> {
  const rpc = new Client({ handler: agent });
  const repo: ActorIdentifier = agent.sub;
  const notes = new Map<string, MarginNote>();
  let cursor: string | undefined;
  do {
    const page = await ok(
      rpc.get("com.atproto.repo.listRecords", {
        params: { repo, collection: MARGIN_NOTE_COLLECTION, limit: 100, cursor },
      }),
    );
    for (const record of page.records) {
      const rkey = record.uri.split("/").pop();
      if (rkey) notes.set(rkey, record.value as unknown as MarginNote);
    }
    cursor = page.cursor;
  } while (cursor);
  return notes;
}

/** Adapt an OAuth-authenticated agent to the core {@link RepoClient} interface. */
export function createRepoClient(agent: OAuthUserAgent): RepoClient {
  const rpc = new Client({ handler: agent });
  const repo: ActorIdentifier = agent.sub;
  return {
    async putNote(rkey, record) {
      const result = await ok(
        rpc.post("com.atproto.repo.putRecord", {
          input: {
            repo,
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
