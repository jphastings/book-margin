const S32_ALPHABET = "234567abcdefghijklmnopqrstuvwxyz";
const MICROS_PER_SECOND = 1_000_000n;
// One (non-leap) year of microseconds — the span of the sentinel year (1970,
// the first a TID can represent) that undated records are scattered across.
const MICROS_PER_YEAR = 365n * 24n * 60n * 60n * MICROS_PER_SECOND;

/**
 * Build a deterministic atproto TID (the 13-char rkey) from a stable seed and a
 * timestamp.
 *
 * For a dated record the TID's time component is the timestamp at second
 * resolution, so records sort chronologically; the microseconds and the 10-bit
 * clock field are derived from SHA-256(seed) rather than a clock. The whole rkey
 * is therefore a pure function of the record's identity — the same annotation
 * always targets the same rkey, so re-syncs are idempotent with no repo reads.
 *
 * An undated record (an empty/unparseable timestamp) is instead placed somewhere
 * in the sentinel year 1970, with its *entire* sub-year offset taken from the
 * hash. That keeps such records grouped at the very start of the repo while
 * giving them a large space — ~45 bits of micro-seconds plus the 10-bit clock —
 * in which to stay collision-free, which matters because timestamp-less imports
 * are common and would otherwise crowd into a single instant and potentially clash.
 */
export async function deterministicTid(seed: string, isoTimestamp: string): Promise<string> {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(seed)),
  );
  const clockId = BigInt(((digest[4]! << 8) | digest[5]!) & 0x3ff);

  const ms = Date.parse(isoTimestamp);
  const micros = Number.isNaN(ms)
    ? readBig(digest, 6, 7) % MICROS_PER_YEAR
    : BigInt(Math.floor(ms / 1000)) * MICROS_PER_SECOND + BigInt(readUint32(digest, 0) % 1_000_000);

  return encodeTid((micros << 10n) | clockId);
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

function readUint32(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset]! << 24) |
      (bytes[offset + 1]! << 16) |
      (bytes[offset + 2]! << 8) |
      bytes[offset + 3]!) >>>
    0
  );
}

/** Read `length` big-endian bytes from `offset` as a bigint. */
function readBig(bytes: Uint8Array, offset: number, length: number): bigint {
  let value = 0n;
  for (let i = 0; i < length; i++) value = (value << 8n) | BigInt(bytes[offset + i]!);
  return value;
}
