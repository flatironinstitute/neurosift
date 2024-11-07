import { Hyperlink, SmallIconButton, VBoxLayout } from "@fi-sci/misc";
import { Chat, Search } from "@mui/icons-material";
import { FunctionComponent, useCallback, useEffect, useState } from "react";
import SearchResults, { applicationBarColorDarkened } from "./SearchResults";
import { DandisetSearchResultItem, DandisetsResponse } from "./types";
import useRoute from "neurosift-lib/contexts/useRoute";

type Props = {
  width: number;
  height: number;
};

export const getDandiApiHeaders = (
  useStaging: boolean,
): { headers: { [key: string]: string }; apiKeyProvided: boolean } => {
  const headers: { [key: string]: string } = {};
  const dandiApiKey = useStaging
    ? localStorage.getItem("dandiStagingApiKey") || ""
    : localStorage.getItem("dandiApiKey") || "";
  if (dandiApiKey) {
    headers["Authorization"] = `token ${dandiApiKey}`;
  }
  return { headers, apiKeyProvided: !!dandiApiKey };
};

const topBarHeight = 12;
const searchBarHeight = 50;
const DandiBrowser: FunctionComponent<Props> = ({ width, height }) => {
  const { route, setRoute } = useRoute();
  if (route.page !== "dandi")
    throw Error("Unexpected route for DandiBrowser: " + route.page);
  const staging = !!route.staging;
  const [searchText, setSearchText] = useState<string>("");
  const [searchResult, setSearchResults] = useState<DandisetSearchResultItem[]>(
    [],
  );
  const stagingStr = staging ? "-staging" : "";
  const toggleStaging = useCallback(() => {
    setRoute({ page: "dandi", staging: !staging });
  }, [staging, setRoute]);
  useEffect(() => {
    let canceled = false;
    setSearchResults([]);
    (async () => {
      const { headers, apiKeyProvided } = getDandiApiHeaders(staging);
      const embargoedStr = apiKeyProvided ? "true" : "false";
      const response = await fetch(
        `https://api${stagingStr}.dandiarchive.org/api/dandisets/?page=1&page_size=50&ordering=-modified&search=${searchText}&draft=true&empty=false&embargoed=${embargoedStr}`,
        {
          headers,
        },
      );
      if (canceled) return;
      if (response.status === 200) {
        const json = await response.json();
        const dandisetResponse = json as DandisetsResponse;
        setSearchResults(dandisetResponse.results);
      }
    })();
    return () => {
      canceled = true;
    };
  }, [searchText, stagingStr, staging]);

  return (
    <VBoxLayout
      width={width}
      heights={[
        topBarHeight,
        searchBarHeight,
        height - topBarHeight - searchBarHeight,
      ]}
    >
      <div
        style={{
          position: "absolute",
          width,
          display: "flex",
          justifyContent: "right",
        }}
      >
        <span style={{ fontSize: 10 }}>
          <Hyperlink
            onClick={() => {
              setRoute({ page: "dandi-query", staging: staging });
            }}
          >
            advanced query
          </Hyperlink>
        </span>
        &nbsp;|&nbsp;
        <span style={{ fontSize: 10 }}>
          <Hyperlink onClick={toggleStaging}>
            use {staging ? "main site" : "staging site"}
          </Hyperlink>
        </span>
        <div style={{ width: 50 }} />
      </div>
      <div>
        <SearchBar
          width={width}
          height={searchBarHeight}
          onSearch={setSearchText}
        />
      </div>
      <div>
        <RecentlyViewedDandisets />
        <SearchResults
          width={width}
          height={height - searchBarHeight}
          searchResults={searchResult}
          useStaging={staging}
        />
      </div>
    </VBoxLayout>
  );
};

type RecentlyViewedDandiset = {
  dandisetId: string;
  dandisetVersion: string;
  title: string;
  staging: boolean;
};

const isRecentlyViewedDandiset = (x: any): x is RecentlyViewedDandiset => {
  if (!x) return false;
  if (typeof x !== "object") return false;
  return (
    typeof x.dandisetId === "string" &&
    typeof x.dandisetVersion === "string" &&
    typeof x.title === "string" &&
    typeof x.staging === "boolean"
  );
};

const getRecentlyViewedDandisets = (): RecentlyViewedDandiset[] => {
  const k = "recentlyViewedDandisets";
  const s = localStorage.getItem(k);
  if (!s) return [];
  const x = JSON.parse(s);
  if (!Array.isArray(x)) return [];
  if (!x.every(isRecentlyViewedDandiset)) return [];
  return x;
};

export const reportRecentlyViewedDandiset = (
  dandiset: RecentlyViewedDandiset,
) => {
  if (!dandiset.dandisetId) return;
  let x = getRecentlyViewedDandisets().filter(
    (d) => d.dandisetId !== dandiset.dandisetId && d.dandisetId,
  );
  x.unshift(dandiset);
  if (x.length > 10) {
    x = x.slice(0, 10);
  }
  localStorage.setItem("recentlyViewedDandisets", JSON.stringify(x));
};

const RecentlyViewedDandisets: FunctionComponent = () => {
  const { setRoute } = useRoute();
  const recentlyViewed = getRecentlyViewedDandisets();
  if (recentlyViewed.length === 0) return <span />;
  return (
    <div style={{ paddingLeft: 11, fontStyle: "italic" }}>
      Recently viewed:&nbsp;|&nbsp;
      {recentlyViewed.map((dandiset) => (
        <span key={dandiset.dandisetId}>
          <Hyperlink
            onClick={() => {
              setRoute({
                page: "dandiset",
                dandisetId: dandiset.dandisetId,
                dandisetVersion: dandiset.dandisetVersion,
                staging: dandiset.staging,
              });
            }}
            color={applicationBarColorDarkened}
            title={`${dandiset.dandisetId} (${dandiset.dandisetVersion}): ${dandiset.title}`}
          >
            {dandiset.dandisetId}
          </Hyperlink>
          &nbsp;|&nbsp;
        </span>
      ))}
    </div>
  );
};

type SearchBarProps = {
  width: number;
  height: number;
  onSearch: (searchText: string) => void;
};

const SearchBar: FunctionComponent<SearchBarProps> = ({
  width,
  height,
  onSearch,
}) => {
  const [searchText, setSearchText] = useState<string>("");
  const searchButtonWidth = height;

  return (
    <div style={{ paddingLeft: 15 }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: searchButtonWidth,
          height,
        }}
      >
        <SearchButton
          width={searchButtonWidth}
          height={height}
          onClick={() => onSearch(searchText)}
        />
      </div>

      <div
        style={{
          position: "absolute",
          left: searchButtonWidth,
          top: 0,
          width: width - searchButtonWidth,
          height,
        }}
      >
        <input
          style={{
            width: width - 40 - searchButtonWidth,
            height: 30,
            fontSize: 20,
            padding: 5,
          }}
          type="text"
          placeholder="Search DANDI"
          onChange={(e) => setSearchText(e.target.value)}
          // when enter is pressed
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onSearch(searchText);
            }
          }}
          // do not spell check
          spellCheck={false}
        />
      </div>
    </div>
  );
};

// const Checkbox: FunctionComponent<{checked: boolean, onClick: () => void, label: string}> = ({checked, onClick, label}) => {
//     return (
//         <div style={{display: 'flex', alignItems: 'center', cursor: 'pointer'}} onClick={onClick}>
//             <div style={{width: 20, height: 20, borderRadius: 3, border: '1px solid black', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
//                 {checked && <div style={{width: 10, height: 10, borderRadius: 2, background: 'black'}} />}
//             </div>
//             <div style={{marginLeft: 5}}>{label}</div>
//         </div>
//     )
// }

type SearchButtonProps = {
  onClick: () => void;
  width: number;
  height: number;
};

const SearchButton: FunctionComponent<SearchButtonProps> = ({
  onClick,
  width,
  height,
}) => {
  return <SmallIconButton icon={<Search />} label="" fontSize={height - 5} />;
};

export default DandiBrowser;
