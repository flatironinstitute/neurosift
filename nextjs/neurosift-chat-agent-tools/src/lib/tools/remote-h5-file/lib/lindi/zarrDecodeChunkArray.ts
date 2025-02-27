import { Blosc } from "numcodecs";
import pako from "pako";
import { qfcDecompress } from "./qfc";

/* eslint-disable @typescript-eslint/no-explicit-any */
const zarrDecodeChunkArray = async (
  chunk: ArrayBuffer,
  dtype?: string,
  compressor?: any,
  filters?: any[],
  shape?: number[],
): Promise<any> => {
  let ret: any = chunk;
  if (compressor) {
    if (compressor.id === "blosc") {
      ret = await new Blosc().decode(chunk);
    } else if (compressor.id === "gzip") {
      ret = pako.inflate(chunk);
    } else if (compressor.id === "neurosift.mp4") {
      // ret = await decodeMp4(chunk, shape![0], shape![1], shape![2]);
      throw Error("neurosift.mp4 decoder not yet implemented");
    } else if (compressor.id === "qfc") {
      if (!shape) {
        throw Error("No shape for qfc");
      }
      ret = await qfcDecompress(chunk, shape, compressor);
    } else {
      throw Error("Unhandled compressor " + compressor.id);
    }
  }
  // check if Uint8Array
  if (ret instanceof Uint8Array) {
    ret = ret.buffer;
  }
  if (dtype === "|O") {
    if (!shape) throw Error("No shape for |O");
    if (!filters) {
      throw Error("No filters for |O");
    }
    if (filters.length === 0) {
      throw Error("No filters for |O");
    }
    // work backwards through the filters, besides the first one which should be json2
    for (let i = filters.length - 1; i > 0; i--) {
      ret = await applyFilter(ret, filters[i]);
    }
    const filter0 = filters[0];
    if (filter0.id !== "json2") {
      throw Error("First filter for |O should be json2");
    }
    ret = await applyFilterToOType(ret, filter0, shape);
  } else {
    // work our way backward through the filters
    if (filters) {
      for (let i = filters.length - 1; i >= 0; i--) {
        ret = await applyFilter(ret, filters[i]);
      }
    }
    if (!dtype) {
      // pass
    } else if (dtype === "<f4") {
      ret = new Float32Array(ret);
    } else if (dtype === "<f8") {
      ret = new Float64Array(ret);
    } else if (dtype === "<i1" || dtype === "|i1") {
      ret = new Int8Array(ret);
    } else if (dtype === "<i2") {
      ret = new Int16Array(ret);
    } else if (dtype === "<i4") {
      ret = new Int32Array(ret);
    } else if (dtype === "<i8") {
      const ret0 = new BigInt64Array(ret);
      // convert to Int32Array because javascript has trouble mixing BigInt64Array with other types
      ret = new Int32Array(ret0.length);
      for (let i = 0; i < ret0.length; i++) {
        ret[i] = Number(ret0[i]);
      }
    } else if (dtype === "<u1" || dtype === "|u1") {
      ret = new Uint8Array(ret);
    } else if (dtype === "<u2") {
      ret = new Uint16Array(ret);
    } else if (dtype === "<u4") {
      ret = new Uint32Array(ret);
    } else if (dtype === "<u8") {
      const ret0 = new BigUint64Array(ret);
      // convert to Uint32Array because javascript has trouble mixing BigUint64Array with other types
      ret = new Uint32Array(ret0.length);
      for (let i = 0; i < ret0.length; i++) {
        ret[i] = Number(ret0[i]);
      }
    } else if (dtype === "|b1") {
      ret = new Uint8Array(ret);
    } else if (dtype.startsWith("<U")) {
      const fixedLength = parseInt(dtype.slice(2));
      const nn = ret.byteLength / (fixedLength * 4);
      const ret2 = [];
      for (let i = 0; i < nn; i++) {
        const ret1 = new Uint32Array(ret, i * fixedLength * 4, fixedLength);
        const ret3 = new Array(fixedLength);
        for (let j = 0; j < fixedLength; j++) {
          ret3[j] = String.fromCodePoint(ret1[j]);
        }
        ret2.push(ret3.join(""));
      }
      ret = ret2;
    } else if (dtype.startsWith("|S")) {
      const fixedLength = parseInt(dtype.slice(2));
      const nn = ret.byteLength / fixedLength;
      const ret2 = [];
      for (let i = 0; i < nn; i++) {
        const ret1 = new Uint8Array(ret, i * fixedLength, fixedLength);
        ret2.push(new TextDecoder().decode(ret1));
      }
      ret = ret2;
    } else {
      throw Error("Unhandled dtype " + dtype);
    }
  }
  return ret;
};

const applyFilterToOType = async (
  chunk: ArrayBuffer,
  filter: any,
  shape: number[],
) => {
  if (filter.id === "vlen-utf8") {
    const view = new DataView(chunk);
    const ret = [];
    let i = 4;
    while (i < chunk.byteLength) {
      const byte1 = view.getUint32(i, true);
      const byte2 = view.getUint32(i + 1, true);
      const byte3 = view.getUint32(i + 2, true);
      const byte4 = view.getUint32(i + 3, true);
      const len = byte1 + (byte2 << 8) + (byte3 << 16) + (byte4 << 24);
      i += 4;
      ret.push(new TextDecoder().decode(chunk.slice(i, i + len)));
      i += len;
    }
    return ret;
  } else if (filter.id === "vlen-bytes") {
    const view = new DataView(chunk);
    const ret = [];
    let i = 4;
    while (i < chunk.byteLength) {
      const byte1 = view.getUint32(i, true);
      const byte2 = view.getUint32(i + 1, true);
      const byte3 = view.getUint32(i + 2, true);
      const byte4 = view.getUint32(i + 3, true);
      const len = byte1 + (byte2 << 8) + (byte3 << 16) + (byte4 << 24);
      i += 4;
      ret.push(chunk.slice(i, i + len));
      i += len;
    }
    return ret;
  } else if (filter.id === "json2") {
    const aa = JSON.parse(new TextDecoder().decode(chunk));
    // aa has the form [item1, item2, ..., itemN, '|O', shape]
    if (aa.length <= 2) {
      console.warn("Unexpected json2", aa);
      return new TextDecoder().decode(chunk);
    }
    if (!sameShape(aa[aa.length - 1], shape)) {
      throw Error(
        `Unexpected shape for json2 filter: ${aa[aa.length - 1]} !== ${shape}`,
      );
    }
    if (!(aa[aa.length - 2] === "|O")) {
      throw Error(
        `Unexpected dtype for json2 filter: ${aa[aa.length - 2]} !== |O`,
      );
    }
    if (!(aa.length - 2 === shape[0])) {
      throw Error(
        `Unexpected length for json2 filter: ${aa.length - 2} !== ${shape[0]}`,
      );
    }
    if (shape.length > 1) {
      return flattenArray(aa.slice(0, aa.length - 2), shape);
    }
    return aa.slice(0, aa.length - 2);
  } else {
    throw Error("Unhandled filter for |O " + filter.id);
  }
};

const applyFilter = async (chunk: ArrayBuffer, filter: any) => {
  if (filter.id === "zlib") {
    const a = pako.inflate(chunk);
    return a.buffer;
  } else if (filter.id === "blosc") {
    return new Blosc().decode(chunk);
  } else if (filter.id === "shuffle") {
    const elementSize = filter.elementsize;
    const view = new DataView(chunk);
    const ret = new Uint8Array(chunk.byteLength);
    const a = chunk.byteLength / elementSize;
    for (let i = 0; i < chunk.byteLength; i++) {
      const b = i % elementSize;
      const c = Math.floor(i / elementSize) * elementSize;
      const j = b * a + c;
      ret[j] = view.getUint8(i);
    }
    return ret.buffer;
  }
  console.warn("Filter not yet implemented", filter);
  throw Error("Filter not yet implemented");
};

const sameShape = (a: number[], b: number[]): boolean => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

const flattenArray = (aa: any[], shape: number[]): any[] => {
  if (shape.length === 1) return aa;
  const ret = [];
  for (let i = 0; i < shape[0]; i++) {
    const x = flattenArray(aa[i], shape.slice(1));
    for (const xx of x) {
      ret.push(xx);
    }
  }
  return ret;
};

export default zarrDecodeChunkArray;
