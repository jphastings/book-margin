import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { Client, ok } from "@atcute/client";
import type { ActorIdentifier } from "@atcute/lexicons";
import { PasswordSession, type PasswordSessionData } from "@atcute/password-session";
import { resolvePdsEndpoint } from "./pds.ts";

export interface AuthOptions {
  /** PDS / entryway URL. When omitted, it's resolved from the identifier's DID. */
  service?: string;
  identifier?: string;
  password?: string;
  /** Where the persisted session is read from / written to. */
  sessionPath: string;
}

export interface Authenticated {
  rpc: Client;
  did: ActorIdentifier;
}

/**
 * Authenticate to a PDS. Resumes a persisted session when present, otherwise
 * logs in with an app password. The refreshed session is written back so later
 * runs don't need the password again.
 */
export async function authenticate(options: AuthOptions): Promise<Authenticated> {
  const onUpdate = (session: PasswordSessionData) => persist(options.sessionPath, session);
  const saved = await readJson(options.sessionPath);

  const auth = saved
    ? await PasswordSession.resume(saved, { onUpdate })
    : await loginWithPassword(options, onUpdate);

  const rpc = new Client({ handler: auth });
  const session = await ok(rpc.get("com.atproto.server.getSession"));
  return { rpc, did: session.did };
}

async function loginWithPassword(
  options: AuthOptions,
  onUpdate: (session: PasswordSessionData) => Promise<void>,
): Promise<PasswordSession> {
  if (!options.identifier || !options.password) {
    throw new Error(
      "No saved session. Provide --identifier and --password (or set KINDLE_MARGIN_APP_PASSWORD).",
    );
  }
  const service = options.service ?? (await resolveService(options.identifier));
  const auth = await PasswordSession.login(
    { service, identifier: options.identifier, password: options.password },
    { onUpdate },
  );
  await persist(options.sessionPath, auth.session);
  return auth;
}

async function resolveService(identifier: string): Promise<string> {
  if (identifier.includes("@")) {
    throw new Error("Logging in by email needs an explicit --service <your PDS URL>.");
  }
  return resolvePdsEndpoint(identifier);
}

async function persist(path: string, session: PasswordSessionData): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(session), { mode: 0o600 });
}

async function readJson(path: string): Promise<PasswordSessionData | undefined> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as PasswordSessionData;
  } catch {
    return undefined;
  }
}
