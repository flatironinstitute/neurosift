import { FunctionComponent } from "react";
import { DatasetPluginProps } from "../pluginInterface";
import Hdf5View from "../../../../NwbPage/Hdf5View";

const SnirfView: FunctionComponent<DatasetPluginProps> = ({ file, width }) => {
  // SNIRF files are HDF5 files, so we can use the Hdf5View component directly
  // file.urls[0] contains the URL to the SNIRF file
  return (
    <div>
      <Hdf5View nwbUrl={file.urls[0]} width={width || 800} isExpanded={true} />
    </div>
  );
};

export default SnirfView;
