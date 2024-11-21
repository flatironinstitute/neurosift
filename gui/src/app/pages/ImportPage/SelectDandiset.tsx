import { FunctionComponent, useCallback, useEffect, useState } from "react";
import { DandisetSearchResultItem } from "../DandiPage/DandiBrowser/types";
import SearchResults from "../DandiPage/DandiBrowser/SearchResults";
import { Hyperlink } from "@fi-sci/misc";

type CreateOrSelectDandisetProps = {
  width: number;
  height: number;
  onSelectDandiset: (dandisetId: string) => void;
  dandiStagingApiKey: string;
  setDandiStagingApiKey: (dandiStagingApiKey: string) => void;
};

const CreateOrSelectDandiset: FunctionComponent<
  CreateOrSelectDandisetProps
> = ({
  width,
  height,
  onSelectDandiset,
  dandiStagingApiKey,
  setDandiStagingApiKey,
}) => {
  const [refreshCode, setRefreshCode] = useState(0);
  const dandisetSearchResults: DandisetSearchResultItem[] | undefined | null =
    useOwnedDandisets(dandiStagingApiKey, refreshCode);

  const selectDandiApiKeyComponent = (
    <SelectDandiStagingApiKey
      dandiStagingApiKey={dandiStagingApiKey}
      setDandiStagingApiKey={setDandiStagingApiKey}
    />
  );

  const createDandisetComponent = (
    <a
      href="https://gui-staging.dandiarchive.org/dandiset/create"
      target="_blank"
      rel="noreferrer"
    >
      Create new Dandiset
    </a>
  );

  const refreshComponent = (
    <Hyperlink onClick={() => setRefreshCode((c) => c + 1)}>Refresh</Hyperlink>
  );

  if (!dandiStagingApiKey) {
    return (
      <div>
        {createDandisetComponent}&nbsp;
        {selectDandiApiKeyComponent}
      </div>
    );
  }

  const topBarHeight = 30;
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
        <div>{selectDandiApiKeyComponent}</div>
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
          {refreshComponent}&nbsp;
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
          onSelectedDandiset={onSelectDandiset}
        />
      </div>
    </div>
  );
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

const useOwnedDandisets = (dandiStagingApiKey: string, refreshCode: number) => {
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
  }, [dandiStagingApiKey, refreshCode]);
  if (!dandiStagingApiKey) {
    return null;
  }
  if (!searchResults) {
    return undefined;
  }
  return searchResults;
};

export default CreateOrSelectDandiset;
