import {
  RemoteH5FileX,
  RemoteH5Group,
} from "neurosift-lib/remote-h5-file/index";
import { FunctionComponent, useMemo } from "react";
import DynamicTableView from "../viewPlugins/DynamicTable/DynamicTableView";
import ViewPluginButton from "../viewPlugins/ViewPluginButton";
import { getViewPlugins } from "../viewPlugins/viewPlugins";

type Props = {
  nwbFile: RemoteH5FileX;
  group: RemoteH5Group;
  width: number;
};

const UnitsContentPanel: FunctionComponent<Props> = ({
  nwbFile,
  group,
  width,
}) => {
  const viewPlugins = useMemo(
    () => getViewPlugins({ nwbUrl: nwbFile.getUrls()[0] || "" }),
    [nwbFile],
  );
  return (
    <div>
      <div>&nbsp;</div>
      <div style={{ display: "flex" }}>
        {viewPlugins
          .filter((vp) => vp.neurodataType === "Units")
          .map((vp) => (
            <div key={vp.name} style={{ display: "flex" }}>
              <ViewPluginButton viewPlugin={vp} path={group.path} />
              <div>&nbsp;</div>
            </div>
          ))}
      </div>
      <div>&nbsp;</div>
      <DynamicTableView
        width={width}
        height={300}
        path={group.path}
        referenceColumnName={"id"}
      />
    </div>
  );
};

export default UnitsContentPanel;
