import { FunctionComponent, useCallback, useEffect, useState } from "react";
import { DandisetSearchResultItem } from "../DandiPage/DandiBrowser/types";
import SearchResults from "../DandiPage/DandiBrowser/SearchResults";
import { Hyperlink } from "@fi-sci/misc";

type CreateOrSelectDandisetProps = {
  width: number;
  height: number;
};

const CreateOrSelectDandiset: FunctionComponent<
  CreateOrSelectDandisetProps
> = ({ width, height }) => {
  const { dandiStagingApiKey, setDandiStagingApiKey } = useDandiStagingApiKey();
  const dandisetSearchResults: DandisetSearchResultItem[] | undefined | null =
    useOwnedDandisets(dandiStagingApiKey);
  const [selectedDandisetId, setSelectedDandisetId] = useState<string | null>(
    null,
  );
  const [mode, setMode] = useState<"create" | "select" | "edit">("select");

  const selectDandiApiKeyComponent = (
    <SelectDandiStagingApiKey
      dandiStagingApiKey={dandiStagingApiKey}
      setDandiStagingApiKey={setDandiStagingApiKey}
    />
  );

  const createDandisetComponent = (
    <a href="https://gui-staging.dandiarchive.org/dandiset/create" target="_blank" rel="noreferrer">
      Create new Dandiset
    </a>
  );

  if (!dandiStagingApiKey) {
    return (
      <div>
        {createDandisetComponent}&nbsp;
        {selectDandiApiKeyComponent}
      </div>
    )
  }

  const topBarHeight = 30;
  if (mode === "edit") {
    if (selectedDandisetId) {
      return (
        <div style={{ position: "absolute", width, height }}>
          <div
            style={{
              position: "absolute",
              top: 0,
              width,
              height: topBarHeight,
              backgroundColor: "#eee",
            }}
          >
            <div style={{ paddingLeft: 10 }}>
              <button onClick={() => setMode("select")}>
                Back to Dandisets
              </button>
            </div>
          </div>
          <div
            style={{
              position: "absolute",
              top: topBarHeight,
              width,
              height: height - topBarHeight,
            }}
          >
            <EditDandiset
              width={width}
              height={height - topBarHeight}
              dandisetId={selectedDandisetId}
              dandiStagingApiKey={dandiStagingApiKey}
            />
          </div>
        </div>
      );
    } else {
      setMode("select");
    }
  } else if (mode === "select") {
    if (dandisetSearchResults === null) {
      return (
        <div>
          <div>Error loading dandisets</div>
          <div>{selectDandiApiKeyComponent}</div>
        </div>
      );
    }
    if (dandisetSearchResults === undefined) {
      return (
        <div>
          <div>Loading dandisets...</div>
          <div>
            {selectDandiApiKeyComponent}
          </div>
        </div>
      );
    }
    return (
      <div style={{ position: "absolute", width, height }}>
        <div
          style={{
            position: "absolute",
            top: 0,
            width,
            height: topBarHeight,
            backgroundColor: "#eee",
          }}
        >
          <div style={{ paddingLeft: 10 }}>
            {createDandisetComponent}&nbsp;
            {selectDandiApiKeyComponent}
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            top: topBarHeight,
            width,
            height: height - topBarHeight,
          }}
        >
          <SearchResults
            width={width}
            height={height - topBarHeight}
            searchResults={dandisetSearchResults}
            useStaging={true}
            onSelectedDandiset={(dandisetId, dandisetVersion) => {
              setSelectedDandisetId(dandisetId);
              setMode("edit");
            }}
          />
        </div>
      </div>
    );
  } else if (mode === "create") {
    return <div>Create dandiset</div>;
  } else {
    return <div>Invalid mode: {mode}</div>;
  }
};

type SelectDandiStagingApiKeyProps = {
  dandiStagingApiKey: string;
  setDandiStagingApiKey: (dandiStagingApiKey: string) => void;
};

const SelectDandiStagingApiKey: FunctionComponent<
  SelectDandiStagingApiKeyProps
> = ({ dandiStagingApiKey, setDandiStagingApiKey }) => {
  return (
    <span>
      <label>DANDI staging API key:&nbsp;</label>
      <input
        type="password"
        value={dandiStagingApiKey}
        onChange={(e) => setDandiStagingApiKey(e.target.value)}
        style={{ width: 40 }}
      />
    </span>
  );
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

const useOwnedDandisets = (dandiStagingApiKey: string) => {
  const [searchResults, setSearchResults] = useState<
    DandisetSearchResultItem[] | undefined
  >(undefined);
  useEffect(() => {
    let canceled = false;
    const load = async () => {
      setSearchResults(undefined);
      const url =
        "https://api-staging.dandiarchive.org/api/dandisets/?draft=true&empty=true&embargoed=false&user=me";
      const headers = {
        accept: "application/json",
        authorization: `token ${dandiStagingApiKey}`,
      };
      const response = await fetch(url, { headers });
      const data = await response.json();
      if (canceled) return;
      setSearchResults(data.results);
    };
    load();
    return () => {
      canceled = true;
    };
  }, [dandiStagingApiKey]);
  if (!dandiStagingApiKey) {
    return null;
  }
  if (!searchResults) {
    return undefined;
  }
  return searchResults;
};

type EditDandisetProps = {
  width: number;
  height: number;
  dandisetId: string;
  dandiStagingApiKey: string;
};

const EditDandiset: FunctionComponent<EditDandisetProps> = ({
  width,
  height,
  dandisetId,
  dandiStagingApiKey,
}) => {
  return <div>Edit dandiset {dandisetId}</div>;
};

export default CreateOrSelectDandiset;
