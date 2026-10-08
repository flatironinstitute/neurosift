import { registry } from "zarrita";

/**
 * The checksum HDF5's fletcher32 filter appends to a chunk. Decoding drops
 * its four bytes. The checksum is not verified.
 */
class Fletcher32Codec {
  kind = "bytes_to_bytes" as const;
  static fromConfig(): Fletcher32Codec {
    return new Fletcher32Codec();
  }
  encode(): never {
    throw new Error("The fletcher32 codec is read-only");
  }
  decode(bytes: Uint8Array): Uint8Array {
    return bytes.subarray(0, bytes.length - 4);
  }
}

/**
 * Register the codecs that zarrshadow's references use and zarrita does not
 * have. A ReferenceStore calls this when it is made.
 */
export function registerCodecs(): void {
  // zarrita types its registry for its own codecs
  const codecs = registry as unknown as Map<string, () => unknown>;
  if (!codecs.has("numcodecs.fletcher32"))
    codecs.set("numcodecs.fletcher32", () => Fletcher32Codec);
}
