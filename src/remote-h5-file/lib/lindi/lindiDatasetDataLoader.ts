/* eslint-disable @typescript-eslint/no-explicit-any */
import ReferenceFileSystemClient from "./ReferenceFileSystemClient";
import { ZarrFileSystemClient, ZMetaDataZArray } from "./RemoteH5FileLindi";

const lindiDatasetDataLoader = async (o: {
  client: ReferenceFileSystemClient | ZarrFileSystemClient;
  path: string;
  zarray: ZMetaDataZArray;
  slice: [number, number][];
  assertSingleChunkInFirstTwoDimensions?: boolean;
  disableCache?: boolean;
}) => {
  const { client, zarray, path, slice, assertSingleChunkInFirstTwoDimensions } =
    o;

  const chunkShape = zarray.chunks;
  const shape = zarray.shape;
  const dtype = zarray.dtype;
  if (!chunkShape) throw Error("No chunks shape for " + path);
  if (!shape) throw Error("No shape for " + path);
  if (!dtype) throw Error("No dtype for " + path);
  const ndims = shape.length;
  if (ndims !== chunkShape.length)
    throw Error("Mismatched ndims and chunk shape for " + path);

  if (o.slice.length === 3) {
    // in this case we slice by two and then return the result of slicing by the third
    const slice1 = slice.slice(0, 2);
    const sN1 = slice1[0][1] - slice1[0][0];
    const sN2 = slice1[1][1] - slice1[1][0];
    const sN3 = o.slice[2][1] - o.slice[2][0];
    const sNother = shape.slice(3).reduce((a, b) => a * b, 1);
    const N3 = shape[2];
    const xx = await lindiDatasetDataLoader({
      client,
      path,
      zarray,
      slice: slice1,
      assertSingleChunkInFirstTwoDimensions,
      disableCache: o.disableCache,
    });
    const xxRet = allocateArrayWithDtype(sN1 * sN2 * sN3 * sNother, dtype);
    let iRet = 0;
    for (let i1 = 0; i1 < sN1; i1++) {
      for (let i2 = 0; i2 < sN2; i2++) {
        for (let i3 = o.slice[2][0]; i3 < o.slice[2][1]; i3++) {
          for (let i4 = 0; i4 < sNother; i4++) {
            xxRet[iRet] = xx[i4 + sNother * (i3 + N3 * (i2 + sN2 * i1))];
            iRet++;
          }
        }
      }
    }
    return xxRet;
  }
  if (o.slice.length > 3) {
    throw Error(
      `For now, you can't slice more than three dimensions at a time. You tried to slice ${o.slice.length} dimensions for ${path}.`,
    );
  }

  const macroChunkShape = chunkShape.map((cs, i) => Math.ceil(shape[i] / cs));

  // check if we have a single chunk with no filters or compression (single contiguous block of data)
  // It's important to handle this case specially because in this situation we don't need to download
  // the entire chunk, we can just download the slice we need.
  const singleChunk = macroChunkShape.reduce((a, b) => a * b, 1) === 1;
  const noFiltersOrCompression =
    !zarray.compressor && (!zarray.filters || zarray.filters.length === 0);
  if (singleChunk && noFiltersOrCompression && slice && slice.length > 0) {
    if (slice.length > 2) {
      throw Error(
        "For now, you can only slice two dimensions at a time for single chunk contiguous data",
      );
    }
    const dtypeByteSize = getDtypeByteSize(dtype);
    const startByte =
      slice[0][0] * shape.slice(1).reduce((a, b) => a * b, 1) * dtypeByteSize;
    const endByte =
      slice[0][1] * shape.slice(1).reduce((a, b) => a * b, 1) * dtypeByteSize;
    let singleChunkPath = path + "/0";
    for (let i = 1; i < ndims; i++) {
      singleChunkPath += ".0";
    }
    const dd = await client.readBinary(singleChunkPath, {
      decodeArray: false,
      startByte,
      endByte,
    });
    let a = createDataView(dd, dtype);
    if (slice.length === 2) {
      if (shape.length === 1) {
        if (slice[1][0] !== 0 || slice[1][1] !== 1) {
          throw Error(
            `For now, you can't slice the second dimension for single chunk contiguous data`,
          );
        }
        return a;
      }
      const ss = shape.slice(2).reduce((a, b) => a * b, 1);
      const newRet = allocateArrayWithDtype(
        (slice[0][1] - slice[0][0]) * (slice[1][1] - slice[1][0]) * ss,
        dtype,
      );
      let iRet = 0;
      for (let i = 0; i < slice[0][1] - slice[0][0]; i++) {
        for (let j = slice[1][0]; j < slice[1][1]; j++) {
          for (let k = 0; k < ss; k++) {
            newRet[iRet] = a[(i * shape[1] + j) * ss + k];
            iRet++;
          }
        }
      }
      a = newRet as any;
    }
    return a;
  }

  const prodChunkSizeOfAllButFirstDimension = chunkShape
    .slice(1)
    .reduce((a, b) => a * b, 1);
  const prodChunkSizeOfAllButFirstTwoDimensions = chunkShape
    .slice(2)
    .reduce((a, b) => a * b, 1);
  const prodShapeSizeOfAllButFirstTwoDimensions = shape
    .slice(2)
    .reduce((a, b) => a * b, 1);
  const prodMacroChunkShapeAllButFirstTwoDimensions = macroChunkShape
    .slice(2)
    .reduce((a, b) => a * b, 1);

  let i1Start = 0;
  let i1End = shape[0];
  let i2Start = 0;
  let i2End = ndims > 1 ? shape[1] : 1;
  if (slice) {
    if (slice.length >= 1) {
      i1Start = slice[0][0];
      i1End = slice[0][1];
    }
    if (slice.length >= 2) {
      i2Start = slice[1][0];
      i2End = slice[1][1];
    }
    if (slice.length > 2) {
      throw Error(
        `For now, you can't slice more than two dimensions at a time. You tried to slice ${slice.length} dimensions for ${path}.`,
      );
    }
  }
  if (i1End > shape[0]) i1End = shape[0];
  if (i2End > shape[1]) i2End = shape[1];

  const shape2 = ndims > 1 ? shape[1] : 1;
  const chunkShape2 = ndims > 1 ? chunkShape[1] : 1;

  if (i1Start < 0) {
    throw Error(`Problem slicing ${path}: i1Start < 0: ${i1Start}`);
  }
  if (i1End > shape[0]) {
    throw Error(
      `Problem slicing ${path}: i1End > shape[0]: ${i1End} > ${shape[0]}`,
    );
  }
  if (i2Start < 0) {
    throw Error(`Problem slicing ${path}: i2Start < 0: ${i2Start}`);
  }
  if (i2End > shape2) {
    throw Error(
      `Problem slicing ${path}: i2End > shape[1]: ${i2End} > ${chunkShape2}`,
    );
  }

  const i1StartChunk = Math.floor(i1Start / chunkShape[0]);
  const i1EndChunk = Math.floor((i1End - 1) / chunkShape[0]);
  const i2StartChunk = ndims > 1 ? Math.floor(i2Start / chunkShape[1]) : 0;
  const i2EndChunk = ndims > 1 ? Math.floor((i2End - 1) / chunkShape[1]) : 0;
  if (i1StartChunk === i1EndChunk && i2StartChunk === i2EndChunk) {
    // With respect to the first two dimensions,
    // we are entirely within a single chunk.

    if (prodMacroChunkShapeAllButFirstTwoDimensions === 1) {
      // in this case we are truly in a single chunk because there is only one chunk in the other dimensions
      let chunkPath = path + "/" + i1StartChunk;
      if (ndims > 1) {
        chunkPath += "." + i2StartChunk;
      }
      for (let d = 2; d < ndims; d++) {
        chunkPath += ".0";
      }
      const x = await client.readBinary(chunkPath, {
        decodeArray: true,
        disableCache: o.disableCache,
      });
      if (!x) {
        console.log({
          i1StartChunk,
          i1EndChunk,
          i2StartChunk,
          i2EndChunk,
          i1Start,
          i1End,
          i2Start,
          i2End,
          shape,
          chunkShape,
        });
        throw Error("Unable to read chunk: " + chunkPath);
      }
      const j1Start = i1Start - i1StartChunk * chunkShape[0];
      const j1End = i1End - i1StartChunk * chunkShape[0];
      const j2Start = i2Start - i2StartChunk * chunkShape2;
      const j2End = i2End - i2StartChunk * chunkShape2;
      const slicingInSecondDimension =
        ndims > 1 && (j2Start > 0 || j2End < chunkShape2);
      if (!slicingInSecondDimension) {
        // we are not slicing in second dimension. In this case we don't need to make a copy of the data
        const ret = x.slice(
          j1Start * prodChunkSizeOfAllButFirstDimension,
          j1End * prodChunkSizeOfAllButFirstDimension,
        );
        return ret;
      } else {
        // we are slicing in second dimension, so we need to make a copy of the data
        const ret = allocateArrayWithDtype(
          (i1End - i1Start) *
            (i2End - i2Start) *
            prodShapeSizeOfAllButFirstTwoDimensions,
          dtype,
        );
        let iRet = 0;
        for (let j1 = j1Start; j1 < j1End; j1++) {
          for (let j2 = j2Start; j2 < j2End; j2++) {
            for (
              let j3 = 0;
              j3 < prodShapeSizeOfAllButFirstTwoDimensions;
              j3++
            ) {
              ret[iRet] =
                x[
                  (j1 * chunkShape2 + j2) *
                    prodChunkSizeOfAllButFirstTwoDimensions +
                    j3
                ];
              iRet++;
            }
          }
        }
        return ret;
      }
    } else {
      // there is more than one chunk in the other dimensions, and we need to concatenate them
      if (ndims > 4) {
        throw Error("Case not yet supported: C2");
      }
      while (macroChunkShape.length < 4) {
        macroChunkShape.push(1);
      }
      const retList = [];
      for (let iii3 = 0; iii3 < macroChunkShape[2]; iii3++) {
        for (let iii4 = 0; iii4 < macroChunkShape[3]; iii4++) {
          let chunkPath = path + "/" + i1StartChunk;
          chunkPath += "." + i2StartChunk;
          chunkPath += "." + iii3;
          if (ndims === 4) {
            chunkPath += "." + iii4;
          }
          const x = await client.readBinary(chunkPath, {
            decodeArray: true,
            disableCache: o.disableCache,
          });
          if (!x) {
            console.log({
              i1StartChunk,
              i1EndChunk,
              i2StartChunk,
              i2EndChunk,
              i1Start,
              i1End,
              i2Start,
              i2End,
              shape,
              chunkShape,
            });
            throw Error("Unable to read chunk: " + chunkPath);
          }
          const j1Start = i1Start - i1StartChunk * chunkShape[0];
          const j1End = i1End - i1StartChunk * chunkShape[0];
          const j2Start = i2Start - i2StartChunk * chunkShape2;
          const j2End = i2End - i2StartChunk * chunkShape2;
          const slicingInSecondDimension =
            ndims > 1 && (j2Start > 0 || j2End < chunkShape2);
          if (!slicingInSecondDimension) {
            // we are not slicing in second dimension. In this case we don't need to make a copy of the data
            const ret0 = x.slice(
              j1Start * prodChunkSizeOfAllButFirstDimension,
              j1End * prodChunkSizeOfAllButFirstDimension,
            );
            retList.push(ret0);
          } else {
            // we are slicing in second dimension, so we need to make a copy of the data
            const ret0 = allocateArrayWithDtype(
              (i1End - i1Start) *
                (i2End - i2Start) *
                prodChunkSizeOfAllButFirstTwoDimensions,
              dtype,
            );
            let iRet0 = 0;
            for (let j1 = j1Start; j1 < j1End; j1++) {
              for (let j2 = j2Start; j2 < j2End; j2++) {
                for (
                  let j3 = 0;
                  j3 < prodChunkSizeOfAllButFirstTwoDimensions;
                  j3++
                ) {
                  ret0[iRet0] =
                    x[
                      (j1 * chunkShape2 + j2) *
                        prodChunkSizeOfAllButFirstTwoDimensions +
                        j3
                    ];
                  iRet0++;
                }
              }
            }
            retList.push(ret0);
          }
        }
      }
      // now concatenate the ret0s
      const ret = allocateArrayWithDtype(
        (i1End - i1Start) *
          (i2End - i2Start) *
          prodShapeSizeOfAllButFirstTwoDimensions,
        dtype,
      );
      let iRet = 0;
      for (let i1 = 0; i1 < i1End - i1Start; i1++) {
        for (let i2 = 0; i2 < i2End - i2Start; i2++) {
          for (let i = 0; i < retList.length; i++) {
            for (
              let i3 = 0;
              i3 < prodChunkSizeOfAllButFirstTwoDimensions;
              i3++
            ) {
              ret[iRet] =
                retList[i][
                  i1 *
                    (i2End - i2Start) *
                    prodChunkSizeOfAllButFirstTwoDimensions +
                    i2 * prodChunkSizeOfAllButFirstTwoDimensions +
                    i3
                ];
              iRet++;
            }
          }
        }
      }
      return ret;
    }
  }

  if (assertSingleChunkInFirstTwoDimensions)
    throw Error(
      "Unexpected case. We should have handled all cases by now (assertSingleChunkInFirstTwoDimensions)",
    );

  const ret = allocateArrayWithDtype(
    (i1End - i1Start) *
      (i2End - i2Start) *
      prodShapeSizeOfAllButFirstTwoDimensions,
    dtype,
  );

  const handleChunk = async (o2: {
    slice1: [number, number];
    slice2: [number, number];
  }) => {
    const { slice1, slice2 } = o2;
    const sliceA = [slice1, slice2];
    const xx = await lindiDatasetDataLoader({
      client,
      path,
      zarray,
      slice: sliceA,
      assertSingleChunkInFirstTwoDimensions: true, // avoid infinite recursion by accident
      disableCache: o.disableCache,
    });
    let iXX = 0;
    for (let ii1 = slice1[0]; ii1 < slice1[1]; ii1++) {
      for (let ii2 = slice2[0]; ii2 < slice2[1]; ii2++) {
        let iRet =
          (ii1 - i1Start) *
            (i2End - i2Start) *
            prodShapeSizeOfAllButFirstTwoDimensions +
          (ii2 - i2Start) * prodShapeSizeOfAllButFirstTwoDimensions;
        for (
          let ii3 = 0;
          ii3 < prodShapeSizeOfAllButFirstTwoDimensions;
          ii3++
        ) {
          ret[iRet] = xx[iXX];
          iRet++;
          iXX++;
        }
      }
    }
  };

  const promises: Promise<void>[] = [];
  for (let i1Chunk = i1StartChunk; i1Chunk <= i1EndChunk; i1Chunk++) {
    let slice1: [number, number];
    if (i1Chunk === i1StartChunk && i1Chunk === i1EndChunk) {
      slice1 = [i1Start, i1End];
    } else if (i1Chunk === i1StartChunk) {
      slice1 = [i1Start, (i1Chunk + 1) * chunkShape[0]];
    } else if (i1Chunk === i1EndChunk) {
      slice1 = [i1Chunk * chunkShape[0], i1End];
    } else {
      slice1 = [i1Chunk * chunkShape[0], (i1Chunk + 1) * chunkShape[0]];
    }
    for (let i2Chunk = i2StartChunk; i2Chunk <= i2EndChunk; i2Chunk++) {
      let slice2: [number, number];
      if (i2Chunk === i2StartChunk && i2Chunk === i2EndChunk) {
        slice2 = [i2Start, i2End];
      } else if (i2Chunk === i2StartChunk) {
        slice2 = [i2Start, (i2Chunk + 1) * chunkShape2];
      } else if (i2Chunk === i2EndChunk) {
        slice2 = [i2Chunk * chunkShape2, i2End];
      } else {
        slice2 = [i2Chunk * chunkShape2, (i2Chunk + 1) * chunkShape2];
      }

      promises.push(handleChunk({ slice1, slice2 }));
    }
  }
  await Promise.all(promises);
  return ret;
};

const allocateArrayWithDtype = (size: number, dtype: string) => {
  if (dtype === "<f4") return new Float32Array(size);
  if (dtype === "<f8") return new Float64Array(size);
  if (dtype === "<i1" || dtype === "|i1") return new Int8Array(size);
  if (dtype === "<i2") return new Int16Array(size);
  if (dtype === "<i4") return new Int32Array(size);
  if (dtype === "<i8") {
    const a = new BigInt64Array(size);
    // convert to regular Int32Array because js has trouble mixing BigInt64Array with other numbers
    const ret = new Int32Array(size);
    for (let i = 0; i < size; i++) {
      ret[i] = Number(a[i]);
    }
    return ret;
  }
  if (dtype === "<u1" || dtype === "|u1") return new Uint8Array(size);
  if (dtype === "<u2") return new Uint16Array(size);
  if (dtype === "<u4") return new Uint32Array(size);
  if (dtype === "<u8") {
    const a = new BigUint64Array(size);
    // convert to regular Uint32Array because js has trouble mixing BigUint64Array with other numbers
    const ret = new Uint32Array(size);
    for (let i = 0; i < size; i++) {
      ret[i] = Number(a[i]);
    }
    return ret;
  }
  if (dtype === "|O") return new Array(size);
  throw Error(`Unsupported dtype: ${dtype}`);
};

const createDataView = (dd: ArrayBuffer, dtype: string) => {
  if (dtype === "<f4") return new Float32Array(dd);
  if (dtype === "<f8") return new Float64Array(dd);
  if (dtype === "<i1" || dtype === "|i1") return new Int8Array(dd);
  if (dtype === "<i2") return new Int16Array(dd);
  if (dtype === "<i4") return new Int32Array(dd);
  if (dtype === "<i8") return new BigInt64Array(dd);
  if (dtype === "<u1" || dtype === "|u1") return new Uint8Array(dd);
  if (dtype === "<u2") return new Uint16Array(dd);
  if (dtype === "<u4") return new Uint32Array(dd);
  if (dtype === "<u8") return new BigUint64Array(dd);
  throw Error(`Unsupported dtype: ${dtype}`);
};

const getDtypeByteSize = (dtype: string) => {
  if (dtype === "<f4") return 4;
  if (dtype === "<f8") return 8;
  if (dtype === "<i1" || dtype === "|i1") return 1;
  if (dtype === "<i2") return 2;
  if (dtype === "<i4") return 4;
  if (dtype === "<i8") return 8;
  if (dtype === "<u1" || dtype === "|u1") return 1;
  if (dtype === "<u2") return 2;
  if (dtype === "<u4") return 4;
  if (dtype === "<u8") return 8;
  throw Error(`Unsupported dtype: ${dtype}`);
};

export default lindiDatasetDataLoader;
