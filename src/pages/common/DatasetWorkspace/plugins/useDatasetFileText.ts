import { resolveDatasetFileUrl } from "@hdf5Interface";
import { useEffect, useState } from "react";

type FileText = { text?: string; error?: string };

/** Fetches a dataset file as text; neither field is set while it loads. */
const useDatasetFileText = (url: string): FileText => {
  const [state, setState] = useState<FileText>({});
  useEffect(() => {
    let canceled = false;
    setState({});
    resolveDatasetFileUrl(url)
      .then((resolved) => fetch(resolved))
      .then((response) => {
        if (!response.ok)
          throw new Error(`Failed to fetch the file (HTTP ${response.status})`);
        return response.text();
      })
      .then(
        (text) => !canceled && setState({ text }),
        (err) =>
          !canceled &&
          setState({ error: err instanceof Error ? err.message : String(err) }),
      );
    return () => {
      canceled = true;
    };
  }, [url]);
  return state;
};

export default useDatasetFileText;
