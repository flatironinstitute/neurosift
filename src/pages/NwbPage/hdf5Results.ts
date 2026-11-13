import { useEffect, useState } from "react";
import { errorMessage } from "../../util/reportError";
import {
  getHdf5Dataset,
  getHdf5Group,
  type Hdf5Dataset,
  type Hdf5Group,
} from "./hdf5Interface";

/** A load that is pending (both undefined), done (value) or failed (error, a sentence for people). */
export type Hdf5Result<T> = { value: T | undefined; error: string | undefined };

const useHdf5Result = <T>(
  load: () => Promise<T | undefined>,
  missing: string,
  deps: unknown[],
): Hdf5Result<T> => {
  const [result, setResult] = useState<Hdf5Result<T>>({
    value: undefined,
    error: undefined,
  });
  useEffect(() => {
    setResult({ value: undefined, error: undefined });
    let canceled = false;
    load().then(
      (value) => {
        if (canceled) return;
        setResult(
          value === undefined
            ? { value: undefined, error: missing }
            : { value, error: undefined },
        );
      },
      (err) => {
        if (!canceled)
          setResult({ value: undefined, error: errorMessage(err) });
      },
    );
    return () => {
      canceled = true;
    };
    // The loader and message follow from deps, the url and path.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return result;
};

export const useHdf5GroupResult = (url: string, path: string) =>
  useHdf5Result<Hdf5Group>(
    () => getHdf5Group(url, path),
    `This file has no group at ${path}.`,
    [url, path],
  );

export const useHdf5DatasetResult = (url: string, path: string) =>
  useHdf5Result<Hdf5Dataset>(
    () => getHdf5Dataset(url, path),
    `This file has no dataset at ${path}.`,
    [url, path],
  );
