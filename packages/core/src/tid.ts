const S32_ALPHABET = "234567abcdefghijklmnopqrstuvwxyz";
const CLOCK_ID_BITS = 10n;
const CLOCK_ID_MASK = 0x3ffn;

/**
 * Build a deterministic atproto TID (the 13-char rkey) for a record from a
 * stable seed and a timestamp.
 *
 * The TID's time component is the record's own timestamp (microseconds since the
 * epoch), so records sort chronologically in the repo. The 10-bit clock/random
 * field — normally random — is instead the leading bits of SHA-256(seed), making
 * the whole rkey a pure function of the record's identity. Writing the same
 * highlight therefore always targets the same rkey, so re-syncs are idempotent
 * with no need to read existing records.
 */
export async function deterministicTid(seed: string, isoTimestamp: string): Promise<string> {
  const ms = Date.parse(isoTimestamp);
  const micros = BigInt(Number.isNaN(ms) ? 0 : ms) * 1000n;
  const clockId = BigInt(await tenBitHash(seed)) & CLOCK_ID_MASK;
  return encodeTid((micros << CLOCK_ID_BITS) | clockId);
}

/** Big-endian base32-sortable encoding of a 64-bit value into 13 chars. */
function encodeTid(value: bigint): string {
  let remaining = value;
  let tid = "";
  for (let i = 0; i < 13; i++) {
    tid = S32_ALPHABET[Number(remaining & 31n)] + tid;
    remaining >>= 5n;
  }
  return tid;
}

/** The top 10 bits of SHA-256(seed). */
async function tenBitHash(seed: string): Promise<number> {
  const data = new TextEncoder().encode(seed);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  return ((digest[0]! << 8) | digest[1]!) >> 6;
}
