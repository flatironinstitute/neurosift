import {
  MergedRemoteH5File,
  RemoteH5File,
  RemoteH5FileLindi,
} from "@remote-h5-file/index";
import Markdown from "neurosift-lib/components/Markdown";
import { FunctionComponent, useMemo } from "react";
import { useNwbFile } from "neurosift-lib/misc/NwbFileContext";

type LoadInPythonWindowProps = {
  // none
};

const LoadInPynwbWindow: FunctionComponent<LoadInPythonWindowProps> = () => {
  const nwbFile = useNwbFile();

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
    return createSource(nwbFileUrl, urlType);
  }, [urlType, nwbFileUrl]);
  return <Markdown source={source} />;
};

const createSource = (url: string, urlType: "hdf5" | "lindi") => {
  const backtics = "```";
  return `
${backtics}bash
# Prerequisites:
pip install --upgrade lindi pynwb
${backtics}

${backtics}python
import pynwb
import lindi

url = '${url}'

# Load the remote NWB file
${urlType === "lindi" ? "f = lindi.LindiH5pyFile.from_lindi_file(url)" : "f = lindi.LindiH5pyFile.from_hdf5_file(url)"}
io = pynwb.NWBHDF5IO(file=f, mode='r')
nwbfile = io.read()

# Access the data
print(nwbfile)

# Close the file
io.close()
${backtics}

## Notes

See [lindi](https://github.com/neurodatawithoutborders/lindi) for more information on LINDI files.
  `;
};

export default LoadInPynwbWindow;
