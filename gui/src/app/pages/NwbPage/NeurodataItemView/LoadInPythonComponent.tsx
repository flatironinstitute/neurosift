import { FunctionComponent, useMemo } from "react";
import { useModalDialog } from "../../../ApplicationBar";
import {
  useNeurodataItems,
  useNwbFile,
} from "neurosift-lib/misc/NwbFileContext";
import {
  MergedRemoteH5File,
  RemoteH5File,
  RemoteH5FileLindi,
  RemoteH5Group,
} from "neurosift-lib/remote-h5-file/index";
import {
  findViewPluginsForType,
  ViewPlugin,
} from "neurosift-lib/viewPlugins/viewPlugins";
import { Hyperlink } from "@fi-sci/misc";
import ModalWindow from "@fi-sci/modal-window";
import Markdown from "neurosift-lib/components/Markdown";
import { useNwbFileSpecifications } from "neurosift-lib/misc/SpecificationsView/SetupNwbFileSpecificationsProvider";

type Props = {
  path: string;
  group: RemoteH5Group;
  viewName: string;
};

const LoadInPythonComponent: FunctionComponent<Props> = ({
  path,
  group,
  viewName,
}) => {
  const {
    visible: windowVisible,
    handleOpen: handleOpenWindow,
    handleClose: handleCloseWindow,
  } = useModalDialog();

  return (
    <div>
      <Hyperlink onClick={handleOpenWindow}>Load in Python</Hyperlink>
      <ModalWindow visible={windowVisible} onClose={handleCloseWindow}>
        <LoadInPythonWindow path={path} group={group} viewName={viewName} />
      </ModalWindow>
    </div>
  );
};

const LoadInPythonWindow: FunctionComponent<Props> = ({
  path,
  group,
  viewName,
}) => {
  const nwbFile = useNwbFile();
  const specifications = useNwbFileSpecifications();
  const neurodataItems = useNeurodataItems();

  let nwbFileUrl: string;
  let urlType: "hdf5" | "lindi";
  if (nwbFile instanceof MergedRemoteH5File) {
    const f = nwbFile.getFiles()[0];
    if (f instanceof RemoteH5FileLindi) {
      nwbFileUrl = f.url;
      urlType = "lindi";
    } else if (f instanceof RemoteH5File) {
      nwbFileUrl = f.url;
      urlType = "hdf5";
    } else {
      nwbFileUrl = "unknown";
      urlType = "hdf5";
    }
  } else {
    if (nwbFile instanceof RemoteH5FileLindi) {
      nwbFileUrl = nwbFile.url;
      urlType = "lindi";
    } else {
      nwbFileUrl = nwbFile.url;
      urlType = "hdf5";
    }
  }

  const source = useMemo(() => {
    if (!specifications) return "";
    const viewPlugin = findViewPluginsForType(
      group.attrs.neurodata_type,
      { nwbFile, neurodataItems },
      specifications,
    ).defaultViewPlugin;
    return createSource(nwbFileUrl, urlType, viewPlugin, path, group, viewName);
  }, [
    path,
    group,
    viewName,
    nwbFileUrl,
    urlType,
    nwbFile,
    specifications,
    neurodataItems,
  ]);
  return <Markdown source={source} />;
};

const createSource = (
  url: string,
  urlType: "hdf5" | "lindi",
  viewPlugin: ViewPlugin | undefined,
  path: string,
  group: RemoteH5Group,
  viewName: string,
) => {
  const backtics = "```";
  const backtic = "`";
  // const nt = group.attrs.neurodata_type
  const customCode =
    viewPlugin && viewPlugin.getCustomPythonCode
      ? viewPlugin.getCustomPythonCode(group)
      : "";
  return `
## Loading ${backtic}${path}${backtic} (${backtic}${group.attrs.neurodata_type}${backtic}).

${backtics}bash
# Prerequisites:
pip install --upgrade lindi
${backtics}

${backtics}python
import lindi

url = '${url}'

# Load the remote file
${urlType === "lindi" ? "f = lindi.LindiH5pyFile.from_lindi_file(url)" : "f = lindi.LindiH5pyFile.from_hdf5_file(url)"}

# load the neurodata object
X = f['${path}']
${customCode}
${backtics}

## Notes

See [lindi](https://github.com/neurodatawithoutborders/lindi) for more information on LINDI files.
`;
};

export default LoadInPythonComponent;
