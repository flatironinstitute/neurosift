export {
  RemoteH5File,
  MergedRemoteH5File,
  getRemoteH5File,
  getMergedRemoteH5File,
  globalRemoteH5FileStats,
} from "./lib/RemoteH5File";
export type {
  RemoteH5FileX,
  RemoteH5Dataset,
  RemoteH5Group,
  RemoteH5Subdataset,
  RemoteH5Subgroup,
  DatasetDataType,
} from "./lib/RemoteH5File";
export {
  default as RemoteH5FileLindi,
  getRemoteH5FileLindi,
} from "./lib/lindi/RemoteH5FileLindi";
// The Zarr reader is imported dynamically (it brings in zarrita), so only its
// type and the url checks are exported here. Load it with
// import("@remote-h5-file/lib/zarr/RemoteH5FileZarr").
export type { default as RemoteH5FileZarr } from "./lib/zarr/RemoteH5FileZarr";
export { isShadowZarrUrl, isZarrUrl } from "./lib/zarr/zarrUrls";
export type { Canceler } from "./lib/helpers";
