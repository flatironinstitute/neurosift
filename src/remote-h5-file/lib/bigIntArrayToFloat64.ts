// 64-bit integer datasets arrive as BigInt64Array or BigUint64Array. The rest
// of the app does arithmetic with regular numbers, so they are converted to
// Float64Array, which represents every integer up to 2^53 exactly. Converting
// to Int32Array or Uint32Array, as was done before, silently wrapped any value
// beyond 32 bits, such as nanosecond timestamps or large sample indices.
export const bigIntArrayToFloat64 = (
  x: BigInt64Array | BigUint64Array,
): Float64Array => {
  const y = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) {
    y[i] = Number(x[i]);
  }
  return y;
};

export const isBigIntArray = (
  x: unknown,
): x is BigInt64Array | BigUint64Array => {
  return x instanceof BigInt64Array || x instanceof BigUint64Array;
};
