import { RemoteH5FileX } from "../../remote-h5-file/index";
import { useEffect, useState } from "react";

export class RoiClient {
  status: "pending" | "loading" | "loaded" | "error" = "pending";
  array: number[][] | undefined;
  canceler: { onCancel: (() => void)[] } = { onCancel: [] };
  onLoadedCallbacks: (() => void)[] = [];
  constructor(
    private nwbFile: RemoteH5FileX,
    private roiIndices: number[],
    private roiPath: string,
    shape: number[],
    private roiTimestamps0: number[],
  ) {
    (async () => {
      this.status = "loading";
      const a = await this.nwbFile.getDatasetData(this.roiPath + "/data", {
        canceler: this.canceler /*, slice: [[0, 1000]]*/,
      });
      if (!a) throw Error("No data in RoiClient");
      this.array = transpose2DArray(create2DArray(a as any as number[], shape));
      this.status = "loaded";
      this.onLoadedCallbacks.forEach((cb) => cb());
    })();
  }
  static async create(nwbFile: RemoteH5FileX, additionalPaths?: string[]) {
    const roiPath =
      additionalPaths && additionalPaths.length === 1
        ? additionalPaths[0]
        : undefined;
    if (!roiPath) throw Error("Unexpected: no roiPath");
    const ds = await nwbFile.getDataset(roiPath + "/data");
    if (!ds) throw Error("Unable to get dataset: " + roiPath);
    const numRois = ds.shape[1];
    const roiIndices = Array.from({ length: numRois }, (_, i) => i);
    let timestamps: number[];

    const timestampsDataset = await nwbFile.getDataset(roiPath + "/timestamps");
    if (timestampsDataset) {
      const timestampsDatasetData = await nwbFile.getDatasetData(
        roiPath + "/timestamps",
        {},
      );
      if (!timestampsDatasetData)
        throw Error(
          "Unable to get data for dataset: " + roiPath + "/timestamps",
        );
      timestamps = timestampsDatasetData as any as number[];
    } else {
      const startingTimeDataset = await nwbFile.getDataset(
        roiPath + "/starting_time",
      );
      if (!startingTimeDataset)
        throw Error(
          "Unable to get dataset: " +
            roiPath +
            "/timestamps or " +
            roiPath +
            "/starting_time",
        );
      const startingTimeDatasetData = await nwbFile.getDatasetData(
        roiPath + "/starting_time",
        {},
      );
      if (!startingTimeDatasetData)
        throw Error(
          "Unable to get data for dataset: " + roiPath + "/starting_time",
        );
      const startingTime = startingTimeDatasetData as any as number;
      const rate = startingTimeDataset.attrs["rate"];
      if (!rate)
        throw Error(
          "Unexpected: no rate in starting_time dataset" +
            roiPath +
            "/starting_time",
        );
      timestamps = [];
      for (let i = 0; i < ds.shape[0]; i++) {
        timestamps.push(startingTime + i / rate);
      }
    }
    const client = new RoiClient(
      nwbFile,
      roiIndices,
      roiPath,
      ds.shape,
      timestamps,
    );
    return client;
  }
  destroy() {
    this.canceler.onCancel.forEach((cb) => cb());
  }
  get roiData(): number[][] | undefined {
    if (this.status === "loaded") return this.array;
    return undefined;
  }
  get roiTimestamps(): number[] {
    return this.roiTimestamps0;
  }
  getRoiIndices() {
    return this.roiIndices;
  }
  async waitForLoaded() {
    return new Promise<void>((resolve) => {
      if (this.status === "loaded") {
        resolve();
        return;
      }
      this.onLoadedCallbacks.push(() => {
        resolve();
      });
    });
  }
}

export const useRoiClient = (
  nwbFile: RemoteH5FileX,
  path: string | undefined,
  additionalPaths?: string[],
) => {
  const [roiClient, setRoiClient] = useState<RoiClient | null>(null);
  useEffect(() => {
    if (!path) {
      setRoiClient(null);
      return;
    }
    let canceled = false;
    let client: RoiClient | null = null;
    (async () => {
      client = await RoiClient.create(nwbFile, additionalPaths);
      if (canceled) return;
      setRoiClient(client);
    })();
    return () => {
      if (client) {
        client.destroy();
      }
      canceled = true;
    };
  }, [nwbFile, path, additionalPaths]);
  return roiClient;
};

const create2DArray = (array: number[], shape: number[]) => {
  const result: number[][] = [];
  let i = 0;
  for (let j = 0; j < shape[0]; j++) {
    result.push(array.slice(i, i + shape[1]));
    i += shape[1];
  }
  return result;
};

const transpose2DArray = (array: number[][]) => {
  const result: number[][] = [];
  for (let i = 0; i < array[0].length; i++) {
    result.push(array.map((row) => row[i]));
  }
  return result;
};
