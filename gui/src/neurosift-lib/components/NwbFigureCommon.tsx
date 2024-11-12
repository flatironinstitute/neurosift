import { useEffect, useState } from "react";
import {
  getRemoteH5File,
  getRemoteH5FileLindi,
  RemoteH5File,
  RemoteH5FileLindi,
  RemoteH5FileX,
} from "../remote-h5-file";

export type NwbFigureProps = {
  nwb_url: string;
  path: string;
};

export const useFullWidth = (divElement: HTMLDivElement | null) => {
  const [width, setWidth] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (!divElement) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    resizeObserver.observe(divElement);
    return () => {
      resizeObserver.disconnect();
    };
  }, [divElement]);
  return width;
};

export const useNwbFileContextValue = (nwb_url: string) => {
  const [nwbFile, setNwbFile] = useState<RemoteH5FileX | undefined>(undefined);
  useEffect(() => {
    let canceled = false;
    const load = async () => {
      if (canceled) return;
      let f: RemoteH5File | RemoteH5FileLindi;
      if (nwb_url.endsWith(".lindi.json") || nwb_url.endsWith(".lindi.tar")) {
        f = await getRemoteH5FileLindi(nwb_url);
      } else {
        f = await getRemoteH5File(nwb_url);
      }
      if (canceled) return;
      setNwbFile(f);
    };
    load();
    return () => {
      canceled = true;
    };
  }, [nwb_url]);
  if (!nwbFile) {
    return undefined;
  }
  return {
    nwbFile,
    neurodataItems: [],
  };
};
