import {
  DatasetDataType,
  RemoteH5FileLindi,
  RemoteH5Group,
} from "@remote-h5-file";

class NeurotileEcephysClient {
  private tileCache = new Map<string, Array2D | Array3D>();
  private readonly maxCacheSize = 1000; // Maximum number of tiles to cache

  constructor(
    private file: RemoteH5FileLindi,
    private root: RemoteH5Group,
    private numLevels: number,
  ) {}
  static async create(file: RemoteH5FileLindi, electricalSeriesPath: string) {
    const root = await file.getGroup(electricalSeriesPath + "/ecephys_mosaic");
    if (!root)
      throw new Error(
        `Group not found in the file: ${electricalSeriesPath}/ecephys_mosaic`,
      );
    let numLevels = 1;
    while (true) {
      const levelPath = `level_${numLevels}`;
      const g = await file.getDataset(root.path + "/" + levelPath + "/data");
      if (!g) break; // No more levels
      numLevels++;
    }
    return new NeurotileEcephysClient(file, root, numLevels);
  }
  get numChannels(): number {
    return this.root.attrs["num_channels"];
  }
  get downsamplingBase(): number {
    return this.root.attrs["downsampling_base"];
  }
  get numSamples(): number {
    return this.root.attrs["num_samples"];
  }
  get numCoveredSamples(): number {
    return this.root.attrs["last_start_sample"];
  }
  get numDownsamplingLevels(): number {
    return this.numLevels;
  }
  get samplingFrequency(): number {
    return this.root.attrs["sampling_frequency"];
  }
  get tileSize(): number {
    return 4096; // hard-coded for now
  }
  get channelGroupSize(): number {
    return 128; // hard-coded for now
  }
  async loadTile(opts: LoadTileOpts) {
    const {
      channelGroupIndex,
      downsamplingLevel,
      tileIndex,
      datasetName = "data",
    } = opts;
    // Create cache key from the tile parameters
    const cacheKey = `${channelGroupIndex}-${downsamplingLevel}-${tileIndex}-${datasetName}`;

    // Check if tile is already cached
    const cachedTile = this.tileCache.get(cacheKey);
    if (cachedTile) {
      return cachedTile;
    }

    console.info(
      `Loading tile: ${tileIndex} for channel group: ${channelGroupIndex}, downsampling level: ${downsamplingLevel}, dataset: ${datasetName}`,
    );

    if (
      channelGroupIndex < 0 ||
      channelGroupIndex * this.channelGroupSize >= this.numChannels
    ) {
      throw new Error(`Invalid channel group: ${channelGroupIndex}`);
    }
    if (
      downsamplingLevel < 0 ||
      downsamplingLevel >= this.numDownsamplingLevels
    ) {
      throw new Error(`Invalid downsampling level: ${downsamplingLevel}`);
    }

    const datasetPath = `${this.root.path}/level_${downsamplingLevel}/${datasetName}`;
    const dataset = await this.file.getDataset(datasetPath);
    if (!dataset) {
      console.warn(
        `Tile data not found for dataset ${datasetName} at path ${datasetPath}`,
      );
      return null;
    }
    const sampleSlice = [
      tileIndex * this.tileSize,
      (tileIndex + 1) * this.tileSize,
    ] as [number, number];
    const channelSlice = [
      channelGroupIndex * this.channelGroupSize,
      Math.min(
        (channelGroupIndex + 1) * this.channelGroupSize,
        this.numChannels,
      ),
    ] as [number, number];
    const slice =
      downsamplingLevel === 0 || datasetName === "spike_counts"
        ? [sampleSlice, channelSlice]
        : [sampleSlice, [0, 2] as [number, number], channelSlice];
    const d = await this.file.getDatasetData(datasetPath, {
      slice,
    });
    if (!d) {
      throw new Error(`Failed to load tile data at path ${datasetPath}`);
    }

    let result: Array2D | Array3D;
    if (datasetName === "spike_counts") {
      // Spike data is always 2D (no min/max)
      result = array2D(
        d,
        sampleSlice[1] - sampleSlice[0],
        channelSlice[1] - channelSlice[0],
      );
    } else if (downsamplingLevel === 0) {
      // Raw data does not have min/max
      result = array2D(
        d,
        sampleSlice[1] - sampleSlice[0],
        channelSlice[1] - channelSlice[0],
      );
    } else {
      result = array3D(
        d,
        sampleSlice[1] - sampleSlice[0],
        2,
        channelSlice[1] - channelSlice[0],
      );
      for (let i = 0; i < 10; i++) {
        console.log(`--- [0, 0, ${i}]`, result.get(0, 0, i));
      }
    }

    // Implement cache size limit using LRU strategy
    if (this.tileCache.size >= this.maxCacheSize) {
      // Remove the oldest entry (first entry in the Map)
      const firstKey = this.tileCache.keys().next().value;
      if (firstKey !== undefined) {
        this.tileCache.delete(firstKey);
      }
    }

    // Store result in cache
    this.tileCache.set(cacheKey, result);

    return result;
  }
  async loadData(opts: LoadDataOpts) {
    const channelGroupSize = this.channelGroupSize;
    const {
      startChannel,
      endChannel,
      downsamplingLevel,
      startSample,
      endSample,
      datasetName = "data",
    } = opts;
    if (
      startChannel < 0 ||
      endChannel > this.numChannels ||
      startChannel >= endChannel
    ) {
      throw new Error(
        `Invalid channel range: ${startChannel} to ${endChannel}`,
      );
    }
    if (
      downsamplingLevel < 0 ||
      downsamplingLevel >= this.numDownsamplingLevels
    ) {
      throw new Error(`Invalid downsampling level: ${downsamplingLevel}`);
    }
    const tileIndex1 = Math.floor(startSample / this.tileSize);
    const tileIndex2 = Math.floor((endSample - 1) / this.tileSize);
    const channelGroupIndex1 = Math.floor(startChannel / channelGroupSize);
    const channelGroupIndex2 = Math.floor((endChannel - 1) / channelGroupSize);

    // Collect all tile loading operations to execute in parallel
    const tileLoadPromises: Array<{
      promise: Promise<Array2D | Array3D | null>;
      channelGroupIndex: number;
      tileIndex: number;
    }> = [];

    for (
      let channelGroupIndex = channelGroupIndex1;
      channelGroupIndex <= channelGroupIndex2;
      channelGroupIndex++
    ) {
      for (let tileIndex = tileIndex1; tileIndex <= tileIndex2; tileIndex++) {
        const promise = this.loadTile({
          channelGroupIndex,
          downsamplingLevel,
          tileIndex,
          datasetName,
        });
        tileLoadPromises.push({
          promise,
          channelGroupIndex,
          tileIndex,
        });
      }
    }

    // Load all tiles in parallel
    const tileResults = await Promise.all(
      tileLoadPromises.map(async (item) => ({
        tileData: await item.promise,
        channelGroupIndex: item.channelGroupIndex,
        tileIndex: item.tileIndex,
      })),
    );

    // preallocate the response array
    if (datasetName === "spike_counts" || downsamplingLevel === 0) {
      // Spike data or raw data - does not have min/max
      const ret = zeros2D(endSample - startSample, endChannel - startChannel);

      // Process all loaded tiles
      for (const { tileData, channelGroupIndex, tileIndex } of tileResults) {
        if (!tileData) continue; // skip null tiles
        const g = {
          start: channelGroupIndex * this.channelGroupSize,
          end: Math.min(
            (channelGroupIndex + 1) * this.channelGroupSize,
            this.numChannels,
          ),
        };
        for (let i1 = 0; i1 < this.tileSize; i1++) {
          for (let i2 = 0; i2 < g.end - g.start; i2++) {
            const sampleIndex = tileIndex * this.tileSize + i1;
            if (sampleIndex < startSample || sampleIndex >= endSample) continue; // skip samples outside the range
            const channelIndex = g.start + i2;
            if (channelIndex < startChannel || channelIndex >= endChannel)
              continue; // skip channels outside the range
            ret.set(
              sampleIndex - startSample,
              channelIndex - startChannel,
              (tileData as Array2D).get(i1, i2),
            );
          }
        }
      }
      return ret;
    } else {
      const ret = zeros3D(
        endSample - startSample,
        2,
        endChannel - startChannel,
      );

      // Process all loaded tiles
      for (const { tileData, channelGroupIndex, tileIndex } of tileResults) {
        const g = {
          start: channelGroupIndex * this.channelGroupSize,
          end: Math.min(
            (channelGroupIndex + 1) * this.channelGroupSize,
            this.numChannels,
          ),
        };
        for (let i1 = 0; i1 < this.tileSize; i1++) {
          for (let i2 = 0; i2 < g.end - g.start; i2++) {
            const sampleIndex = tileIndex * this.tileSize + i1;
            if (sampleIndex < startSample || sampleIndex >= endSample) continue; // skip samples outside the range
            const channelIndex = g.start + i2;
            if (channelIndex < startChannel || channelIndex >= endChannel)
              continue; // skip channels outside the range
            if (tileData) {
              ret.set(
                sampleIndex - startSample,
                0,
                channelIndex - startChannel,
                tileData.get(i1, 0, i2),
              ); // min
              ret.set(
                sampleIndex - startSample,
                1,
                channelIndex - startChannel,
                tileData.get(i1, 1, i2),
              ); // max
            }
          }
        }
      }
      return ret;
    }
  }
}

type LoadTileOpts = {
  downsamplingLevel: number;
  channelGroupIndex: number;
  tileIndex: number;
  datasetName?: string;
};

type LoadDataOpts = {
  startChannel: number;
  endChannel: number;
  downsamplingLevel: number;
  startSample: number;
  endSample: number;
  datasetName?: string;
};

type ArrayDataType = number[] | DatasetDataType;

export class Array2D {
  constructor(
    private data: ArrayDataType,
    private rows: number,
    private cols: number,
  ) {}

  get(row: number, col: number): number {
    const index = row * this.cols + col;
    return this.data[index];
  }

  set(row: number, col: number, value: number): void {
    const index = row * this.cols + col;
    this.data[index] = value;
  }

  get shape(): [number, number] {
    return [this.rows, this.cols];
  }
}

export class Array3D {
  constructor(
    private data: ArrayDataType,
    private dim1: number,
    private dim2: number,
    private dim3: number,
  ) {}

  get(i: number, j: number, k: number): number {
    const index = i * (this.dim2 * this.dim3) + j * this.dim3 + k;
    return this.data[index];
  }

  set(i: number, j: number, k: number, value: number): void {
    const index = i * (this.dim2 * this.dim3) + j * this.dim3 + k;
    this.data[index] = value;
  }

  get shape(): [number, number, number] {
    return [this.dim1, this.dim2, this.dim3];
  }
}

// Factory functions for creating array wrappers

function array2D(data: DatasetDataType, rows: number, cols: number): Array2D {
  const expectedLength = rows * cols;
  if (data.length !== expectedLength) {
    throw new Error(
      `Data length ${data.length} does not match expected length ${expectedLength} for shape (${rows}, ${cols})`,
    );
  }
  return new Array2D(data, rows, cols);
}

function array3D(
  data: DatasetDataType,
  dim1: number,
  dim2: number,
  dim3: number,
): Array3D {
  const expectedLength = dim1 * dim2 * dim3;
  if (data.length !== expectedLength) {
    throw new Error(
      `Data length ${data.length} does not match expected length ${expectedLength} for shape (${dim1}, ${dim2}, ${dim3})`,
    );
  }
  return new Array3D(data, dim1, dim2, dim3);
}

function zeros2D(rows: number, cols: number): Array2D {
  const data = new Array(rows * cols).fill(0);
  return new Array2D(data, rows, cols);
}

function zeros3D(dim1: number, dim2: number, dim3: number): Array3D {
  const data = new Array(dim1 * dim2 * dim3).fill(0);
  return new Array3D(data, dim1, dim2, dim3);
}

export default NeurotileEcephysClient;
