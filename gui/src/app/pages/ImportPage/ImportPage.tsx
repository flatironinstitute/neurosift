import { FunctionComponent, useCallback, useState } from "react";
import CreateOrSelectDandiset from "./SelectDandiset";
import EditDandisetMetadata from "./EditDandisetMetadata";

type ImportPageProps = {
  width: number;
  height: number;
};

const ImportPage: FunctionComponent<ImportPageProps> = ({ width, height }) => {
  const [dandisetId, setDandisetId] = useState<string | null>(null);
  const [mode, setMode] = useState<"select" | "edit">("select");
  const handleSelectDandiset = useCallback((dandisetId: string) => {
    setDandisetId(dandisetId);
    setMode("edit");
  }, []);
  const { dandiStagingApiKey, setDandiStagingApiKey } = useDandiStagingApiKey();
  if (mode === "select") {
    return (
      <CreateOrSelectDandiset
        width={width}
        height={height}
        onSelectDandiset={handleSelectDandiset}
        dandiStagingApiKey={dandiStagingApiKey}
        setDandiStagingApiKey={setDandiStagingApiKey}
      />
    );
  } else {
    if (!dandisetId) {
      return <div>Error: no dandisetId</div>;
    }
    return (
      <EditDandisetMetadata
        width={width}
        height={height}
        dandisetId={dandisetId}
        dandiStagingApiKey={dandiStagingApiKey}
      />
    );
  }
};

const useLocalStorage = (key: string, initialValue: string) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? item : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: string) => {
      try {
        localStorage.setItem(key, value);
        setStoredValue(value);
      } catch (error) {
        console.error(error);
      }
    },
    [key],
  );

  return [storedValue, setValue] as const;
};

const useDandiStagingApiKey = () => {
  const localStorageKey = "dandiStagingApiKey";
  const [dandiStagingApiKey, setDandiStagingApiKey] = useLocalStorage(
    localStorageKey,
    "",
  );
  return {
    dandiStagingApiKey,
    setDandiStagingApiKey,
  };
};

export default ImportPage;
