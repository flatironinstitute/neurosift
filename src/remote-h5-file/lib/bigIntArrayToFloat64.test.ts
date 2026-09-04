import { describe, expect, it } from "vitest";
import { bigIntArrayToFloat64, isBigIntArray } from "./bigIntArrayToFloat64";

describe("bigIntArrayToFloat64", () => {
  it("keeps values beyond 32 bits exact", () => {
    const x = new BigInt64Array([
      0n,
      -1n,
      3000000000n,
      -3000000000n,
      2n ** 53n,
      1700000000123456789n,
    ]);
    const y = bigIntArrayToFloat64(x);
    expect(y).toBeInstanceOf(Float64Array);
    expect(Array.from(y)).toEqual([
      0,
      -1,
      3000000000,
      -3000000000,
      2 ** 53,
      Number(1700000000123456789n),
    ]);
  });

  it("converts unsigned 64-bit values", () => {
    const x = new BigUint64Array([0n, 4294967296n, 2n ** 53n]);
    expect(Array.from(bigIntArrayToFloat64(x))).toEqual([
      0,
      4294967296,
      2 ** 53,
    ]);
  });

  it("recognizes only BigInt typed arrays", () => {
    expect(isBigIntArray(new BigInt64Array(1))).toBe(true);
    expect(isBigIntArray(new BigUint64Array(1))).toBe(true);
    expect(isBigIntArray(new Int32Array(1))).toBe(false);
    expect(isBigIntArray(new Float64Array(1))).toBe(false);
    expect(isBigIntArray([1n])).toBe(false);
    expect(isBigIntArray(undefined)).toBe(false);
  });
});
