import { InlineMessage, LoadingState } from "@ui";
import { FunctionComponent, useEffect, useState, useMemo } from "react";
import { getLindiUrl } from "../hdf5Interface";
import createUsageScriptForNwbFile from "./createUsageScriptForNwbFile";
import { useNwbFileSpecifications } from "../SpecificationsView/SetupNwbFileSpecificationsProvider";
import PythonCode from "./PythonCode";

type Props = {
  nwbUrl: string;
  onNwbUsage?: (usage: string) => void;
};

const NwbUsageScript: FunctionComponent<Props> = ({ nwbUrl, onNwbUsage }) => {
  const specifications = useNwbFileSpecifications();
  const [scriptContent, setScriptContent] = useState<string | undefined>(
    undefined,
  );
  const [error, setError] = useState<string | undefined>(undefined);

  const headerContent = useMemo(() => {
    const lindiUrl = getLindiUrl(nwbUrl);
    return `# This script shows how to load this in Python using PyNWB and LINDI
# It assumes you have installed PyNWB and LINDI (pip install pynwb lindi)

import pynwb
import lindi

local_cache = lindi.LocalCache()

# Load ${nwbUrl}
${
  lindiUrl
    ? `f = lindi.LindiH5pyFile.from_lindi_file("${lindiUrl}", local_cache=local_cache)`
    : `f = lindi.LindiH5pyFile.from_hdf5_file("${nwbUrl}", local_cache=local_cache)`
}
nwb = pynwb.NWBHDF5IO(file=f, mode='r').read()

`;
  }, [nwbUrl]);

  useEffect(() => {
    // const getUsageScriptFromUrl = async () => {
    //   const lindiUrl = getLindiUrl(nwbUrl);
    //   if (!lindiUrl) {
    //     setError("LINDI file was not found");
    //     return;
    //   }

    //   // Replace nwb.lindi.json with usage.py in the URL
    //   const usageUrl = lindiUrl.replace("nwb.lindi.json", "usage.py");

    //   try {
    //     const response = await fetch(usageUrl);
    //     if (!response.ok) {
    //       if (response.status === 404) {
    //         setError("Usage script was not found");
    //       } else {
    //         setError(`Error fetching usage script: ${response.statusText}`);
    //       }
    //       return;
    //     }
    //     const script = await response.text();
    //     setScriptContent(script);
    //   } catch (error) {
    //     setError(`Error fetching usage script: ${error}`);
    //   }
    // };
    const getUsageScript = async () => {
      if (!nwbUrl) return;
      try {
        const x = await createUsageScriptForNwbFile(nwbUrl, specifications);
        setScriptContent(x);
      } catch (error) {
        setError(`Error creating usage script: ${error}`);
      }
    };
    getUsageScript();
  }, [nwbUrl, specifications]);

  if (error) {
    return <InlineMessage status="error">{error}</InlineMessage>;
  }

  if (!scriptContent || !headerContent) {
    return <LoadingState label="Writing the usage script" phase="loading" />;
  }

  const fullContent = `\`\`\`python\n${headerContent}${scriptContent}\n\`\`\``;
  onNwbUsage?.(fullContent);

  return <PythonCode script={(headerContent + scriptContent).trimEnd()} />;
};

export default NwbUsageScript;
