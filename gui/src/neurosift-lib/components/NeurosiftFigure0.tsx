import { SetupTimeseriesSelection } from "../contexts/context-timeseries-selection";
import { NwbFileContext } from "../misc/NwbFileContext";
import { getViewPlugins, ViewPlugin } from "../viewPlugins/viewPlugins";
import { FunctionComponent, useEffect, useMemo, useState } from "react";
import {
  getRemoteH5File,
  getRemoteH5FileLindi,
  RemoteH5File,
  RemoteH5FileLindi,
  RemoteH5FileX,
} from "../remote-h5-file";

type NeurosiftFigure0Props = {
  nwb_url: string;
  item_path: string;
  view_plugin_name?: string;
  height?: number;
};

const NeurosiftFigure0: FunctionComponent<NeurosiftFigure0Props> = ({
  nwb_url,
  item_path,
  view_plugin_name,
  height,
}) => {
  const [divElement, setDivElement] = useState<HTMLDivElement | null>(null);
  const width = useFullWidth(divElement);

  const additionalItemPaths = useMemo(() => [], []);

  const nwbFileContextValue = useNwbFileContextValue(nwb_url);

  const [viewPlugin, setViewPlugin] = useState<ViewPlugin | undefined | null>(
    undefined,
  );
  const [pluginNotFoundMessage, setPluginNotFoundMessage] = useState<
    string | undefined
  >(undefined);
  useEffect(() => {
    let canceled = false;
    if (view_plugin_name) {
      const vps = getViewPlugins({ nwbUrl: nwb_url });
      const vp = vps.find((p) => p.name === view_plugin_name);
      if (vp) {
        setViewPlugin(vp);
      } else {
        setPluginNotFoundMessage(`View plugin not found: ${view_plugin_name}`);
        setViewPlugin(null);
      }
    } else {
      const load = async () => {
        if (!nwbFileContextValue || !nwbFileContextValue.nwbFile) return;
        const grp = await nwbFileContextValue.nwbFile.getGroup(item_path);
        if (!grp) return;
        if (canceled) return;
        const neurodata_type = grp.attrs["neurodata_type"];
        if (!neurodata_type) return;
        const vps = getViewPlugins({ nwbUrl: nwb_url });
        const defaultViewPlugin = vps.find(
          (p) =>
            p.neurodataType === neurodata_type && p.defaultForNeurodataType,
        );
        if (defaultViewPlugin) {
          setViewPlugin(defaultViewPlugin);
        } else {
          setPluginNotFoundMessage(
            `No default view plugin found for neurodata type: ${neurodata_type}`,
          );
          setViewPlugin(null);
        }
      };
      load();
    }
    return () => {
      canceled = true;
    };
  }, [nwb_url, view_plugin_name, nwbFileContextValue, item_path]);

  return (
    <div
      ref={(elmt) => setDivElement(elmt)}
      style={{ position: "relative", width: "100%", height: height || 400 }}
    >
      {nwbFileContextValue && nwbFileContextValue.nwbFile ? (
        <NwbFileContext.Provider value={nwbFileContextValue}>
          <SetupTimeseriesSelection>
            {viewPlugin ? (
              <viewPlugin.component
                width={width ? width - 10 : 500}
                height={height || 400}
                path={item_path}
                additionalPaths={additionalItemPaths}
                condensed={false}
                hidden={false}
                initialStateString={undefined}
                setStateString={undefined}
              />
            ) : viewPlugin === null ? (
              <span>{pluginNotFoundMessage}</span>
            ) : (
              <div>Loading Neurosift figure...</div>
            )}
          </SetupTimeseriesSelection>
        </NwbFileContext.Provider>
      ) : (
        <div>Loading NWB file...</div>
      )}
    </div>
  );
};

const useFullWidth = (divElement: HTMLDivElement | null) => {
  const [width, setWidth] = useState<number | undefined>(undefined);
  useEffect(() => {
    console.log("---------------------- 2");
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

const useNwbFileContextValue = (nwb_url: string) => {
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
  const ret = useMemo(() => {
    return nwbFile ? { nwbFile, neurodataItems: [] } : undefined;
  }, [nwbFile]);
  return ret;
};

export default NeurosiftFigure0;
