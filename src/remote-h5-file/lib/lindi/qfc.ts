import pako from "pako";
import { inverseTransform } from "./fft";

type QfcCompressionOpts = {
  compression_method: "zlib" | "zstd";
  dtype: "float32" | "int16";
  id: "qfc";
  quant_scale_factor: number;
  segment_length: number;
  zlib_level: number;
  zstd_level: number;
};

const isQfcCompressionOpts = (x: any): x is QfcCompressionOpts => {
  if (!x) return false;
  if (typeof x !== "object") return false;
  if (x.compression_method !== "zlib" && x.compression_method !== "zstd")
    return false;
  if (x.dtype !== "float32" && x.dtype !== "int16") return false;
  if (x.id !== "qfc") return false;
  if (typeof x.quant_scale_factor !== "number") return false;
  if (typeof x.segment_length !== "number") return false;
  if (typeof x.zlib_level !== "number") return false;
  if (typeof x.zstd_level !== "number") return false;
  return true;
};

export const qfcDecompress = async (
  buf: ArrayBuffer,
  shape: number[],
  compressor: QfcCompressionOpts,
): Promise<any> => {
  if (!isQfcCompressionOpts(compressor)) {
    console.warn(compressor);
    throw Error("Invalid qfc compressor");
  }

  const header = new Int32Array(buf, 0, 5);
  if (header[0] !== 7364182) {
    throw Error(`Invalid header[0]: ${header[0]}`);
  }
  if (header[1] !== 1) {
    throw Error(`Invalid header[1]: ${header[1]}`);
  }
  const num_samples = header[2];
  const num_channels = header[3];
  if (num_samples !== shape[0]) {
    throw Error(
      `Unexpected num samples in header. Expected ${shape[0]}, got ${num_samples}`,
    );
  }
  if (num_channels !== shape[1]) {
    throw Error(
      `Unexpected num channels in header. Expected ${shape[1]}, got ${num_channels}`,
    );
  }
  if (header[4] !== compressor.segment_length) {
    throw Error(
      `Unexpected segment length in header. Expected ${compressor.segment_length}, got ${header[4]}`,
    );
  }

  const decompressed_buf = await qfc_multi_segment_decompress({
    buf: buf.slice(4 * 5),
    dtype: compressor.dtype,
    num_channels,
    num_samples,
    segment_length: compressor.segment_length,
    quant_scale_factor: compressor.quant_scale_factor,
    compression_method: compressor.compression_method,
  });

  if (
    decompressed_buf.byteLength !==
    num_samples * num_channels * (compressor.dtype === "float32" ? 4 : 2)
  ) {
    console.warn("compressor", compressor);
    throw Error(
      `Unexpected decompressed buffer length. Expected ${num_samples * num_channels * (compressor.dtype === "float32" ? 4 : 2)}, got ${decompressed_buf.byteLength}`,
    );
  }

  return decompressed_buf;
};

const qfc_multi_segment_decompress = async (o: {
  buf: ArrayBuffer;
  dtype: "float32" | "int16";
  num_channels: number;
  num_samples: number;
  segment_length: number;
  quant_scale_factor: number;
  compression_method: "zlib" | "zstd";
}): Promise<ArrayBuffer> => {
  const {
    buf,
    dtype,
    num_channels,
    num_samples,
    segment_length,
    quant_scale_factor,
    compression_method,
  } = o;

  let decompressedArray: Int16Array;
  if (compression_method === "zlib") {
    decompressedArray = new Int16Array(pako.inflate(buf).buffer);
  } else if (compression_method === "zstd") {
    throw Error("zstd decompression not implemented");
  } else {
    throw Error(`Unexpected compression method: ${compression_method}`);
  }

  return await qfc_multi_segment_inv_pre_compress({
    array: decompressedArray,
    quant_scale_factor,
    segment_length,
    dtype,
    num_channels,
    num_samples,
  });
};

const qfc_multi_segment_inv_pre_compress = async (o: {
  array: Int16Array;
  quant_scale_factor: number;
  segment_length: number;
  dtype: "int16" | "float32";
  num_samples: number;
  num_channels: number;
}): Promise<ArrayBuffer> => {
  const {
    array,
    quant_scale_factor,
    segment_length,
    dtype,
    num_samples,
    num_channels,
  } = o;
  if (segment_length > 0 && segment_length < num_samples) {
    const segment_ranges = _get_segment_ranges(num_samples, segment_length);
    const prepared_segments = await Promise.all(
      segment_ranges.map(
        async (segment_range) =>
          await qfc_inv_pre_compress({
            array: array.slice(
              segment_range[0] * num_channels,
              segment_range[1] * num_channels,
            ),
            quant_scale_factor,
            dtype,
            num_samples: segment_range[1] - segment_range[0],
            num_channels,
          }),
      ),
    );
    if (dtype === "int16") {
      return concatenateInt16Arrays(prepared_segments as Int16Array[]);
    } else if (dtype === "float32") {
      return concatenateFloat32Arrays(prepared_segments as Float32Array[]);
    } else {
      throw Error(`Unexpected dtype: ${dtype}`);
    }
  } else {
    return await qfc_inv_pre_compress({
      array,
      quant_scale_factor,
      dtype,
      num_samples,
      num_channels,
    });
  }
};

const _get_segment_ranges = (
  total_length: number,
  segment_length: number,
): [number, number][] => {
  const segment_ranges: [number, number][] = [];
  for (
    let start_index = 0;
    start_index < total_length;
    start_index += segment_length
  ) {
    segment_ranges.push([
      start_index,
      Math.min(start_index + segment_length, total_length),
    ]);
  }
  const size_of_final_segment =
    segment_ranges[segment_ranges.length - 1][1] -
    segment_ranges[segment_ranges.length - 1][0];
  const half_segment_length = Math.floor(segment_length / 2);
  if (
    size_of_final_segment < half_segment_length &&
    segment_ranges.length > 1
  ) {
    const adjustment = half_segment_length - size_of_final_segment;
    segment_ranges[segment_ranges.length - 2] = [
      segment_ranges[segment_ranges.length - 2][0],
      segment_ranges[segment_ranges.length - 2][1] - adjustment,
    ];
    segment_ranges[segment_ranges.length - 1] = [
      segment_ranges[segment_ranges.length - 1][0] - adjustment,
      segment_ranges[segment_ranges.length - 1][1],
    ];
  }
  return segment_ranges;
};

const qfc_inv_pre_compress = async (o: {
  array: Int16Array;
  quant_scale_factor: number;
  dtype: "int16" | "float32";
  num_samples: number;
  num_channels: number;
}): Promise<Int16Array | Float32Array> => {
  const { array, quant_scale_factor, dtype, num_samples, num_channels } = o;

  const m = Math.floor(num_samples / 2);
  const isEvenNumberOfSamples = num_samples % 2 === 0;
  const qs = quant_scale_factor;
  const x_re = new Float32Array((m + 1) * num_channels);
  for (let i = 0; i < m + 1; i++) {
    for (let j = 0; j < num_channels; j++) {
      x_re[i * num_channels + j] = array[i * num_channels + j] / qs;
    }
  }
  // ns - (ns // 2 + 1) + 2 = ns - ns // 2 - 1 + 2 = ns - ns // 2 + 1 = ns // 2 + 1
  const x_im = new Float32Array((m + 1) * num_channels);
  x_im.fill(0); // probably not necessary
  const mm = isEvenNumberOfSamples ? m : m + 1;
  for (let i = 1; i < mm; i++) {
    for (let j = 0; j < num_channels; j++) {
      x_im[i * num_channels + j] =
        array[(m + 1 + (i - 1)) * num_channels + j] / qs;
    }
  }

  const x_fft = await irfftMultiChannel(x_re, x_im, num_samples, num_channels);
  for (let i = 0; i < x_fft.length; i++) {
    x_fft[i] = x_fft[i] * Math.sqrt(num_samples);
  }
  if (dtype === "int16") {
    const ret = new Int16Array(x_fft.byteLength);
    for (let i = 0; i < x_fft.length; i++) {
      ret[i] = Math.round(x_fft[i]);
    }
    return ret;
  } else if (dtype === "float32") {
    return x_fft;
  } else {
    throw Error(`Unexpected dtype: ${dtype}`);
  }
};

const irfftMultiChannel = async (
  x_re: Float32Array,
  x_im: Float32Array,
  num_samples: number,
  num_channels: number,
): Promise<Float32Array> => {
  const ns = num_samples;
  const nc = num_channels;
  const ret = new Float32Array(ns * nc);
  for (let j = 0; j < nc; j++) {
    const a_re = new Float32Array(x_re.length / nc);
    const a_im = new Float32Array(x_im.length / nc);
    for (let i = 0; i < x_re.length / num_channels; i++) {
      a_re[i] = x_re[i * nc + j];
      a_im[i] = x_im[i * nc + j];
    }
    const b = await irfft(a_re, a_im, num_samples);
    for (let i = 0; i < ns; i++) {
      ret[i * nc + j] = b[i];
    }
  }
  return ret;
};

const irfft = async (
  x_re: Float32Array,
  x_im: Float32Array,
  num_samples: number,
): Promise<Float32Array> => {
  if (x_re.length != Math.floor(num_samples / 2) + 1) {
    throw Error(
      `Unexpected x_re length. Expected ${Math.floor(num_samples / 2) + 1}, got ${x_re.length}`,
    );
  }
  if (x_im.length != Math.floor(num_samples / 2) + 1) {
    throw Error(
      `Unexpected x_im length. Expected ${Math.floor(num_samples / 2) + 1}, got ${x_im.length}`,
    );
  }
  const x_re_copy = new Float32Array(num_samples);
  const x_im_copy = new Float32Array(num_samples);
  for (let i = 0; i < x_re.length; i++) {
    x_re_copy[i] = x_re[i];
    x_im_copy[i] = x_im[i];
    if (i > 0) {
      // the last case is i = x_re.length - 1
      // in this case we are filling in (num_samples - x_re.length + 1)
      // x_re.length = num_samples // 2 + 1
      // so i = num_samples // 2
      // and we're filling in (num_samples - num_samples // 2)
      // in the case where num_samples is even, this is num_samples // 2, and imag part is zero there, so it's correct
      // in the case where num_samples is odd, this is num_samples // 2 + 1, which is correct
      x_re_copy[num_samples - i] = x_re[i];
      x_im_copy[num_samples - i] = -x_im[i];
    }
  }
  inverseTransform(x_re_copy, x_im_copy); // in place
  // let's verify that imaginary part is close to zero
  for (let i = 0; i < num_samples; i++) {
    if (Math.abs(x_im_copy[i]) > 1e-5) {
      throw Error("Unexpected non-zero imaginary part after inverse transform");
    }
  }
  return x_re_copy;
};

const concatenateInt16Arrays = (arrays: Int16Array[]): ArrayBuffer => {
  const total_length = arrays.reduce((acc, x) => acc + x.length, 0);
  const concatenated = new Int16Array(total_length);
  let offset = 0;
  for (const a of arrays) {
    concatenated.set(a, offset);
    offset += a.length;
  }
  return concatenated.buffer;
};

const concatenateFloat32Arrays = (arrays: Float32Array[]): ArrayBuffer => {
  const total_length = arrays.reduce((acc, x) => acc + x.length, 0);
  const concatenated = new Float32Array(total_length);
  let offset = 0;
  for (const a of arrays) {
    concatenated.set(a, offset);
    offset += a.length;
  }
  return concatenated.buffer;
};
