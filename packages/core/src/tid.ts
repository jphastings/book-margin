const S32_ALPHABET = "234567abcdefghijklmnopqrstuvwxyz";
const MICROS_PER_SECOND = 1_000_000n;

/**
 * Build a deterministic atproto TID (the 13-char rkey) from a stable seed and a
 * timestamp.
 *
 * The TID's time component is the record's timestamp at second resolution, so
 * records sort chronologically. The microseconds and the 10-bit clock field —
 * normally a clock reading plus randomness — are instead derived from
 * SHA-256(seed), making the whole rkey a pure function of the record's identity:
 * the same annotation always targets the same rkey, so re-syncs are idempotent
 * with no repo reads. Seeding ~30 bits from the hash keeps keys collision-free
 * even when many records share a timestamp (e.g. a locale whose dates we can't
 * parse and that all fall back to import time).
 */
export async function deterministicTid(seed: string, isoTimestamp: string): Promise<string> {
  const ms = Date.parse(isoTimestamp);
  const seconds = BigInt(Number.isNaN(ms) ? 0 : Math.floor(ms / 1000));

  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(seed)),
  );
  const subSecondMicros = BigInt(readUint32(digest, 0) % 1_000_000);
  const clockId = BigInt(((digest[4]! << 8) | digest[5]!) & 0x3ff);

  const micros = seconds * MICROS_PER_SECOND + subSecondMicros;
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
